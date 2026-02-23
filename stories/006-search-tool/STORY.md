# Story: Search Tool

> ID: 006 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Implement the `anvil_search` MCP tool that combines full-text search (FTS5) with structured metadata filters. This is the primary discovery interface — how agents find notes based on content, metadata, or both. The tool accepts a query string plus optional structured filters and returns ranked results with snippets.

## Acceptance Criteria

- [ ] **anvil_search tool:** Accepts `query` (optional free-text string), `type` (optional), `status` (optional), `priority` (optional), `tags` (optional, array — notes must have ALL specified tags), `due` (optional, object with `gte`/`lte` for date range), `assignee` (optional), `project` (optional), `scope` (optional, object with context/team/service), `limit` (optional, default 20, max 100), `offset` (optional, default 0).
- [ ] **Free-text only:** When only `query` is provided, run FTS5 search with BM25 ranking. Return results sorted by relevance score. Include text snippets showing matching context (FTS5 `snippet()` function).
- [ ] **Filters only:** When only structured filters are provided (no `query`), return all matching notes sorted by `modified` descending (most recently modified first).
- [ ] **Combined:** When both `query` and filters are provided, run FTS5 search first, then apply structured filters to the results. Ranking: FTS5 BM25 score is primary, with a recency boost for recently modified notes.
- [ ] **Tag filtering:** `tags: ["urgent", "work"]` matches notes that have BOTH tags (AND semantics). Tags are case-sensitive.
- [ ] **Date range filtering:** `due: { gte: "2026-02-24", lte: "2026-02-28" }` matches notes with due dates in that range inclusive. Support single-sided ranges (gte only, lte only).
- [ ] **Result format:** Each result includes: `{ noteId, type, title, status, priority, due, tags, modified, score, snippet }`. Score is the combined ranking score (for results with free-text query) or null (for filter-only results). Snippet is an FTS5-generated text excerpt with match highlighting markers (for results with free-text query) or the first 200 chars of the body (for filter-only results).
- [ ] **Pagination:** `limit` and `offset` control result windowing. Response includes `{ results: [...], total: <total matching count>, limit, offset }`.
- [ ] **Empty results:** Return `{ results: [], total: 0, limit, offset }` — not an error.
- [ ] **Performance:** Search across 2700 notes returns within 100ms for typical queries. Index-only queries (no FTS) return within 50ms.
- [ ] **Unit tests:** FTS-only search, filter-only search, combined search, tag AND semantics, date range queries, pagination, empty results, special characters in query (SQL injection prevention).

## Technical Notes

**Key files to create:**
- `src/tools/search.ts` — anvil_search tool handler
- `src/search/query-engine.ts` — Builds and executes SQL queries from filters (shared with story 007)

**Design references:**
- Search architecture: §6 of Phase 1 design doc
- MCP tool signature: §9 of Phase 1 design doc

**Implementation notes:**
- FTS5 query syntax: use `MATCH` for free-text. Sanitize user input to prevent FTS5 syntax errors (escape special chars like `*`, `"`, etc., or wrap in double quotes).
- BM25 with column weights: `bm25(notes_fts, 10.0, 5.0, 1.0)` — title 10x, description 5x, body 1x.
- Recency boost: multiply BM25 score by a decay factor based on `modified` date. Notes modified today get 1.0x, notes from a week ago get 0.9x, etc. Simple exponential decay.
- The query engine should build parameterized SQL — never concatenate user input into queries.
- For combined queries, one approach: get FTS result IDs first, then filter those IDs with metadata conditions. Alternative: use a CTE to join FTS results with metadata filters in a single query.

## Dependencies

- **002** — Core types (QueryFilter, search result types)
- **004** — SQLite index (FTS5, structured queries)
- **005** — MCP server setup (tool registration pattern)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §6, §9 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
