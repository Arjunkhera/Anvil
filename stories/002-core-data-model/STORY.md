# Story: Core Data Model & TypeScript Types

> ID: 002 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Define the TypeScript type system that represents notes, query filters, view data, validation results, and MCP tool inputs/outputs. These types are the shared contract between every layer of the system — storage, indexing, search, views, and MCP tools all speak in terms of these types.

This story also establishes the note identity model (UUID v4 in frontmatter), the relationship model (typed references, explicit related, body wiki-links), and the structured error format used across all MCP tools.

## Acceptance Criteria

- [ ] **Note type:** `Note` type includes all core fields (noteId, type, title, created, modified, tags, related, scope) plus a `fields` record for type-specific fields and a `body` string for markdown content. Clearly distinguishes between `NoteMetadata` (frontmatter only) and `Note` (frontmatter + body).
- [ ] **Relationship types:** `Relationship` type models all three relationship mechanisms: typed references (field name as relation_type), explicit related (relation_type: "related"), body wiki-links (relation_type: "mentions"). Each has source_id, target_id (nullable for unresolved), target_title, and relation_type.
- [ ] **QueryFilter type:** `QueryFilter` supports all filterable fields: type, status, priority, tags (includes/excludes), due (gte/lte/exact), created/modified ranges, scope (context/team/service), assignee, project, free-text. Filters are composable via AND/OR.
- [ ] **ViewData types:** `ListView`, `TableView`, `BoardView` types match the JSON structures defined in §8 of the design doc. Each view type has its own shape for items/rows/columns.
- [ ] **ValidationResult type:** `ValidationResult` includes success/failure, field name, error code, human-readable message, and allowed_values (for enums). Supports aggregating multiple field errors into a single result.
- [ ] **MCP tool input/output types:** Zod schemas for all 7 MCP tool inputs (create, update, get, search, query_view, list_types, get_related) and their response types. These schemas are used both for runtime validation of MCP inputs and for TypeScript type inference.
- [ ] **Error types:** Structured error format: `{ error: true, code: string, message: string, field?: string, allowed_values?: string[] }`. Error codes include: VALIDATION_ERROR, NOT_FOUND, TYPE_NOT_FOUND, DUPLICATE_ID, CONFLICT, SYNC_ERROR.
- [ ] **Scope type:** `Scope` object with optional `context` (enum: personal/work), `team` (string), `service` (string).
- [ ] **Config types:** `VaultConfig` (from `.anvil/config.yaml`), `ServerConfig` (from `~/.anvil/server.yaml` or CLI args), including vault_path, transport, port, log_level.
- [ ] **All types exported from a single entry point:** `src/types/index.ts` re-exports everything for clean imports.
- [ ] **Unit tests:** Type guard functions for runtime type checking (e.g., `isNote()`, `isQueryFilter()`). Zod schemas parse valid inputs and reject invalid ones with clear messages.

## Technical Notes

**Key files to create:**
- `src/types/note.ts` — Note, NoteMetadata, Relationship, RelationType
- `src/types/schema.ts` — TypeDefinition, FieldDefinition, ResolvedType, ValidationResult (may already be partially created in story 001)
- `src/types/query.ts` — QueryFilter, SortOrder, Pagination
- `src/types/view.ts` — ListView, TableView, BoardView, ViewRequest
- `src/types/error.ts` — AnvilError, error codes enum
- `src/types/config.ts` — VaultConfig, ServerConfig
- `src/types/tools.ts` — Zod schemas for all MCP tool inputs/outputs
- `src/types/index.ts` — Barrel export

**Design references:**
- Note identity & relationships: §2 of Phase 1 design doc
- View types: §8 of Phase 1 design doc
- MCP tool signatures: §9 of Phase 1 design doc
- Error format: §9 of Phase 1 design doc

**Implementation notes:**
- Use `zod` for all runtime schemas — the same schema provides TypeScript types (via `z.infer`) and runtime validation
- The `QueryFilter` type should be serializable to JSON so MCP clients can inspect and modify filters
- Reference fields store wiki-link format: `"[[Note Title]]"` — include a utility type/parser for this

## Dependencies

- **001** — Type registry types (FieldDefinition, ResolvedType) are shared between stories 001 and 002. Coordinate on `src/types/schema.ts`.

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §2, §8, §9 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
