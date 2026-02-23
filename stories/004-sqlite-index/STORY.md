# Story: SQLite Index

> ID: 004 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Build the SQLite index layer that stores note metadata, tags, relationships, and full-text search content. This is the derived index that enables fast queries without reading every markdown file. The index is stored in `.anvil/.local/index.db` and can always be rebuilt from the filesystem.

This story covers the schema, CRUD operations, FTS5 virtual table setup, relationship storage (all three types), and the indexer pipeline that transforms a parsed note into index entries.

## Acceptance Criteria

- [ ] **Schema creation:** On first run, create all tables and indexes as defined in §4 of the design doc: `types`, `notes`, `notes_fts` (FTS5), `note_tags`, `relationships`, plus all secondary indexes (type, status, due, modified, tags, relationship target).
- [ ] **Schema migrations:** Versioned migration system. Current schema version stored in a `_meta` table. On startup, check version and run any pending migrations in `src/index/migrations/`. Migration 001 creates the initial schema.
- [ ] **Note upsert:** Insert or update a note in the `notes` table from a `NoteMetadata` object. All core fields mapped to columns. Type-specific fields (status, priority, due, effort) mapped to their nullable columns. Body text stored for FTS indexing.
- [ ] **Tag indexing:** On note upsert, sync the `note_tags` table — delete removed tags, insert new ones. Enforce uniqueness per (note_id, tag) pair.
- [ ] **Relationship indexing:** On note upsert, sync the `relationships` table for all three relationship types: (a) typed references from frontmatter fields with `type: reference` or `type: reference_list`, (b) explicit `related` array entries, (c) body wiki-links (from the wiki-link parser in story 003). Each stored with source_id, target_id (resolved if possible, NULL otherwise), target_title, and relation_type.
- [ ] **Reference resolution:** When inserting relationships, attempt to resolve `target_title` to an existing note's `note_id` by matching title. Store NULL for `target_id` if no match (forward reference). Deduplication: one row per (source_id, target_title, relation_type) triple.
- [ ] **Forward reference reconciliation:** When a new note is created (or title changes), scan for unresolved relationships that match the new title and update their `target_id`. This runs as part of the upsert pipeline, not as a separate background job.
- [ ] **FTS5 setup:** `notes_fts` virtual table using FTS5 with content sync from the `notes` table. Indexed columns: title, description, body_text. Supports BM25 ranking via `rank` function.
- [ ] **FTS5 search:** Given a query string, return ranked results from `notes_fts` with snippets. Support prefix queries (`auth*`), phrase queries (`"user authentication"`), and column-weighted ranking (title matches > body matches).
- [ ] **Structured queries:** Query the `notes` table with any combination of filters: type, status, priority, tags (IN/NOT IN), due range (gte/lte), modified range, scope fields, assignee, project. All filters are optional and composable via AND.
- [ ] **Note deletion:** Remove a note from `notes`, `note_tags`, `relationships` (as source), and `notes_fts`. Also clean up any relationships where this note is the target (set target_id back to NULL, preserving the forward reference).
- [ ] **Full rebuild:** Given a list of all parsed notes, drop and recreate the index within a single transaction. Expected time: ~2-3 seconds for 2700 notes.
- [ ] **Incremental update:** Given a single parsed note, update just that note's entries within a transaction. Expected time: <50ms per note.
- [ ] **Transaction safety:** All multi-table operations (upsert note + tags + relationships + FTS) wrapped in a single transaction. If any step fails, the entire update rolls back.
- [ ] **Unit tests:** Schema creation, upsert/delete, tag sync, relationship resolution, forward reference reconciliation, FTS search (BM25 ranking, prefix, phrase), structured queries with various filter combinations, full rebuild performance.

## Technical Notes

**Key files to create:**
- `src/index/sqlite.ts` — SQLite connection management, schema setup, migration runner
- `src/index/fts.ts` — FTS5 setup, search queries, snippet extraction
- `src/index/indexer.ts` — Note → index entry pipeline (orchestrates note upsert, tag sync, relationship sync, FTS update)
- `src/index/migrations/001_initial.sql` — Initial schema DDL

**Design references:**
- Full schema: §4 of Phase 1 design doc
- Relationship model: §2 of Phase 1 design doc
- Rebuild strategy: §4 of Phase 1 design doc

**Implementation notes:**
- Use `better-sqlite3` (synchronous API, fast, no native async overhead for a local DB)
- FTS5 content sync: use `content=notes, content_rowid=rowid` for external content tables. This means FTS and notes table stay in sync via triggers or manual sync in the indexer.
- BM25 ranking: FTS5 provides `bm25()` function natively. Can weight columns: `bm25(notes_fts, 10.0, 5.0, 1.0)` to boost title > description > body.
- For reconciliation, run: `UPDATE relationships SET target_id = ? WHERE target_title = ? AND target_id IS NULL` after each note upsert.
- Consider WAL mode for SQLite to allow concurrent reads during writes.

## Dependencies

- **001** — Type registry (for the `types` table cache and field-to-column mapping)
- **002** — Core types (Note, NoteMetadata, Relationship)
- **003** — File storage (wiki-link parser for body relationship extraction)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §2, §4 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
