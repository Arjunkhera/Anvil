# Story: Migration Tooling

> ID: 012 | Status: **draft** | Priority: P3-low | Created: 2026-02-23

## Description

Build tooling to migrate an existing Obsidian vault (~2700 files) into an Anvil-managed vault. Migration adds Anvil frontmatter (noteId, type) to existing files, converts Obsidian-specific conventions (dataview inline fields, specific naming patterns) to Anvil's schema, and performs a full index build. Migration must be non-destructive — it should be runnable as a dry-run first and never delete or corrupt existing content.

## Acceptance Criteria

- [ ] **Dry-run mode:** `anvil migrate --dry-run --vault ~/path` scans the vault and reports what would change without modifying any files. Output: per-file report showing which files would get noteId added, which would get type assigned, which have dataview fields to convert, and which have issues (malformed frontmatter, encoding problems, etc.).
- [ ] **noteId injection:** For files without a `noteId` in frontmatter, generate a UUID v4 and add it. For files without any frontmatter, add a minimal frontmatter block (`noteId`, `type: note`, `created` from file ctime, `modified` from file mtime). Preserve existing frontmatter fields — only add missing Anvil core fields.
- [ ] **Type inference:** Attempt to assign types based on directory structure and existing frontmatter: files in `Tasks/` → `type: task`, files in `People/` → `type: person`, files in `Projects/` → `type: project`, files in `Meetings/` → `type: meeting`. Files that don't match any pattern → `type: note`. Type inference rules are configurable via a migration config.
- [ ] **Dataview field conversion:** Detect Obsidian dataview inline fields (`field:: value` syntax) in the body and migrate them to frontmatter. Common patterns: `status:: open` → `status: open` in frontmatter, `due:: 2026-03-01` → `due: 2026-03-01` in frontmatter. Remove the inline field from the body after migrating it to frontmatter.
- [ ] **Wiki-link compatibility:** Obsidian `[[Note Name]]` format is preserved as-is (Anvil uses the same format). `[[Note Name|Display Text]]` aliases are preserved. No conversion needed, but validate that referenced notes exist.
- [ ] **Naming convention migration:** Detect Obsidian naming patterns: `[[PE Name]]` (person prefix) → create/update as `type: person`, `[[SV Name]]` (service prefix) → create/update as `type: service`. Configurable prefix-to-type mapping.
- [ ] **Batch processing:** Migration processes files in batches (default 100) with progress reporting. Support resuming an interrupted migration (track processed files in a `.anvil/.local/migration-state.json`).
- [ ] **Validation report:** After migration, generate a validation report: total files processed, noteIds added, types assigned, dataview fields converted, warnings (malformed files, unresolvable references), errors. Output as both console summary and a detailed JSON/markdown report file.
- [ ] **Non-destructive guarantee:** Migration never deletes files, never removes existing frontmatter fields, never changes the body content (except for dataview field removal when migrated to frontmatter). Create a backup before modifying any file (copy to `.anvil/.local/migration-backup/`).
- [ ] **Post-migration index build:** After migration completes, trigger a full index rebuild to populate the SQLite database with all migrated notes.
- [ ] **Unit tests:** noteId injection (with and without existing frontmatter), type inference from directory paths, dataview field extraction and conversion, dry-run mode (verify no files changed), naming convention detection.

## Technical Notes

**Key files to create:**
- `src/migration/migrator.ts` — Orchestrates the migration pipeline
- `src/migration/type-inferrer.ts` — Directory/content-based type inference
- `src/migration/dataview-converter.ts` — Dataview inline field parser and converter
- `src/migration/report.ts` — Migration report generation

**Design references:**
- Obsidian conventions: §2 of Phase 1 design doc (handling existing conventions)
- Build order: Phase 1d in §12

**Implementation notes:**
- Migration config could be a `.anvil/migration.yaml` file that maps directory patterns to types and naming prefixes to types. Provide a default config that matches common Obsidian vault structures.
- Dataview inline field regex: `/^([a-zA-Z_]+)::\s*(.+)$/gm` — matches `field:: value` at the start of a line.
- For the backup, use a flat directory with files named by their original path (slashes replaced with underscores). This is simpler than replicating the directory tree.
- Consider making migration idempotent — running it twice should be safe (skip files that already have noteId, don't re-convert already-converted dataview fields).

## Dependencies

- **001** — Type registry (for type validation during migration)
- **003** — File storage (read/write with frontmatter)
- **004** — SQLite index (post-migration rebuild)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §2 (Obsidian conventions), §12 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
