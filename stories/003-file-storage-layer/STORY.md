# Story: File Storage Layer

> ID: 003 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Build the file storage layer that reads and writes markdown files with YAML frontmatter to/from the notes vault directory. This layer is the boundary between Anvil's in-memory/SQLite world and the filesystem. It handles frontmatter parsing, body extraction, file naming, directory traversal, and atomic writes.

The filesystem is the source of truth. This layer must be robust against malformed files, missing frontmatter, and concurrent edits (e.g., user editing in a text editor while Anvil is running).

## Acceptance Criteria

- [ ] **Read note:** Given a file path, parse the file into a `Note` object (frontmatter fields + body text). Uses `gray-matter` for frontmatter extraction. Returns a structured error if the file doesn't exist or is unparseable.
- [ ] **Write note:** Given a `Note` object, serialize frontmatter as YAML and body as markdown, write to the file path. Frontmatter field ordering should be consistent (core fields first, then type-specific fields alphabetically). Uses atomic write (write to temp file, then rename) to prevent corruption from crashes mid-write.
- [ ] **Create note file:** Given a type and title, generate a file path based on configurable strategy: `{slug}.md` in a flat directory, or `{type}/{slug}.md` in type-organized directories. Slug is generated from title (lowercase, hyphens, no special chars, max 80 chars). Collision handling: append `-1`, `-2`, etc. if slug already exists.
- [ ] **Scan vault:** Recursively walk the vault directory, find all `.md` files, return a list of file paths. Respects ignore patterns: `.anvil/.local/`, `.git/`, `node_modules/`, temp files (`.*~`, `.#*`, `*.tmp`). Handles symlinks gracefully (follow or skip, configurable).
- [ ] **Frontmatter round-trip fidelity:** Reading a file and writing it back produces an identical file (no field reordering, no whitespace changes, no YAML formatting drift). This is critical for git diffs.
- [ ] **Body wiki-link extraction:** Parse the markdown body for `[[wiki-link]]` patterns. Return a list of referenced titles. Handle edge cases: nested brackets, escaped brackets, links inside code blocks (should be ignored), links with aliases `[[title|display text]]`.
- [ ] **Graceful degradation:** Files without frontmatter are still readable (returned with empty metadata, full body). Files with malformed YAML produce a warning and return what they can (file path, raw content). Never crash on a single bad file.
- [ ] **Encoding:** All files read/written as UTF-8. BOM handling: strip BOM on read if present, never write BOM.
- [ ] **File metadata:** Expose file system metadata (mtime, size) alongside note content for incremental indexing decisions.
- [ ] **Unit tests:** Read/write round-trip, slug generation, wiki-link extraction, malformed file handling, ignore patterns, collision handling.

## Technical Notes

**Key files to create:**
- `src/storage/file-store.ts` — Core read/write/scan operations
- `src/storage/frontmatter.ts` — Frontmatter parse/serialize (wraps gray-matter with round-trip fidelity)
- `src/storage/slug.ts` — Title → slug generation and collision handling
- `src/storage/wiki-links.ts` — Body wiki-link parser

**Design references:**
- File organization: §3 of Phase 1 design doc
- Vault structure: §3 of Phase 1 design doc
- Relationship model (body wiki-links): §2 of Phase 1 design doc

**Implementation notes:**
- `gray-matter` handles YAML frontmatter parsing but may not preserve formatting perfectly. Test round-trip fidelity carefully. May need to use `js-yaml` with `dump()` options for consistent output.
- Atomic writes: use `fs.writeFile` to a `.tmp` file in the same directory, then `fs.rename`. This is atomic on POSIX systems.
- The scan function should return an async iterator or stream for large vaults — don't load all paths into memory at once (though for 2700 files this isn't a real issue).
- Wiki-link regex: `/\[\[([^\]]+)\]\]/g` — but need to handle code blocks (skip fenced code sections before matching).

**Open question (from design doc §16):**
- File naming on create: this story implements slug-based auto-generation as the default. The caller can optionally specify a path override.

## Dependencies

- **002** — Note, NoteMetadata types

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §2, §3 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
