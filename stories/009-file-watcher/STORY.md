# Story: File Watcher

> ID: 009 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Implement the file watcher that monitors the vault directory for changes and triggers incremental re-indexing. This keeps the SQLite index in sync with the filesystem when files are edited externally (e.g., user editing in VS Code, Obsidian, or another text editor while Anvil is running). The watcher also handles startup catchup — detecting files that changed while Anvil was not running.

## Acceptance Criteria

- [ ] **Watcher setup:** On server startup, initialize `chokidar` to watch the vault directory recursively for `.md` file changes (add, change, unlink). The watcher starts after the initial index catchup completes.
- [ ] **Ignore patterns:** The watcher ignores: `.anvil/.local/`, `.git/`, `node_modules/`, temp files (`.*~`, `.#*`, `*.tmp`, `*.swp`). These patterns are configurable via `.anvil/config.yaml` with sensible defaults.
- [ ] **Debounce:** File change events are debounced at 500ms after the last change before triggering a re-index batch. This prevents rapid-fire re-indexing when a file is saved multiple times in quick succession (common with auto-save editors).
- [ ] **Batch processing:** Multiple file changes within the debounce window are collected and processed as a single batch. Each batch runs in a single SQLite transaction for consistency.
- [ ] **Add event:** When a new `.md` file is detected, parse it and index it. If the file has valid frontmatter with a noteId, index normally. If no noteId, index in warn mode (searchable but flagged as unmigrated).
- [ ] **Change event:** When an existing `.md` file is modified, re-parse and re-index it. Update all derived data: notes table, tags, relationships (including re-extracting body wiki-links), FTS content.
- [ ] **Unlink event:** When a `.md` file is deleted, remove it from the index (notes, tags, relationships as source, FTS). Relationships where this note is a target should have their target_id set to NULL (preserving the forward reference from the other note).
- [ ] **Startup catchup:** On startup, if an index exists and schema version matches, compare file mtimes against the index's `modified` timestamps. Re-index any files where the file's mtime is newer than the indexed `modified` value. This handles changes that happened while Anvil was not running.
- [ ] **Startup full rebuild:** If no index exists, or schema version has changed, trigger a full rebuild. Full rebuild runs in background — the MCP server starts immediately and responds to tool calls. Searches during rebuild return partial results (whatever has been indexed so far).
- [ ] **State persistence:** Store watcher state (last known file list with mtimes) in `.anvil/.local/state.json` for fast startup diff.
- [ ] **Type YAML changes:** Watch `.anvil/types/*.yaml` for changes. When a type definition changes, reload the type registry and re-validate all notes of that type (in warn mode — log issues but don't corrupt the index).
- [ ] **Error resilience:** If a single file fails to parse/index, log the error and continue with other files. Never crash the watcher or the MCP server due to a single bad file.
- [ ] **Unit tests:** Debounce behavior, batch collection, add/change/unlink event handling, startup catchup with mtime comparison, ignore pattern matching. Integration test: modify a file on disk, verify index updates within debounce window.

## Technical Notes

**Key files to create:**
- `src/storage/watcher.ts` — Chokidar wrapper with debounce, batch collection, and event routing

**Design references:**
- File watcher: §5 of Phase 1 design doc
- Rebuild strategy: §4 of Phase 1 design doc

**Implementation notes:**
- Use `chokidar` v3 (stable, well-tested across platforms). Falls back to `fs.watch` if chokidar has issues, but chokidar is preferred for its debounce and glob support.
- Debounce implementation: collect events in a Map<filePath, eventType>, reset a timer on each event. When timer fires, process the collected batch.
- For startup catchup, read `state.json` for the last file list. Diff against current file system state. Any new/modified/deleted files get processed.
- Git pull creates many file changes at once. The debounce + batch processing handles this naturally — all changes within the 500ms window become one batch.
- Consider using `chokidar`'s `awaitWriteFinish` option for large files that take time to write.

## Dependencies

- **003** — File storage (file parsing, vault scanning)
- **004** — SQLite index (incremental update, full rebuild)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §5 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
