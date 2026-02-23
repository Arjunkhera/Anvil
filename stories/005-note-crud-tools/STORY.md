# Story: Note CRUD MCP Tools

> ID: 005 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Implement the three core MCP tools for note lifecycle management: `anvil_create_note`, `anvil_get_note`, and `anvil_update_note`. These tools are the primary interface for agents to create, read, and modify notes. They orchestrate validation (type registry), file storage, and index updates in a single operation.

This story also sets up the MCP server entry point using `@modelcontextprotocol/sdk` and establishes the tool registration pattern that all subsequent tool stories follow.

## Acceptance Criteria

- [ ] **MCP server setup:** Entry point (`src/index.ts`) initializes the MCP server using `@modelcontextprotocol/sdk`, loads config, connects to vault, initializes type registry + index, and registers tools. Supports stdio transport. Server responds to MCP `list_tools` with all registered tools and their schemas.
- [ ] **anvil_create_note:** Accepts `type` (required), `title` (required), `content` (optional body text), `fields` (optional type-specific fields), `use_template` (optional, default true). Workflow: validate type exists → generate noteId (UUID v4) → apply template defaults (frontmatter defaults always, body template if use_template=true) → merge caller-provided fields → validate all fields against type schema (strict mode) → generate file path (slug from title) → write file → index note → return `{ noteId, filePath, title, type }`.
- [ ] **anvil_create_note template behavior:** When `use_template: true` (default), the body template from the type definition is inserted (e.g., `## Context\n\n## Acceptance Criteria` for tasks). When `use_template: false`, the body is empty or whatever the caller provides via `content`. Frontmatter defaults are always applied regardless of `use_template`.
- [ ] **anvil_create_note validation errors:** If validation fails (e.g., invalid enum value, missing required field), return a structured error with all failing fields listed. Do not create the file. Error format: `{ error: true, code: "VALIDATION_ERROR", fields: [{ field, message, allowed_values }] }`.
- [ ] **anvil_get_note:** Accepts `noteId` (required). Reads the note from the index to get the file path, then reads the file for full content. Returns: `{ noteId, type, title, fields (all frontmatter), body, relationships: { forward: [...], reverse: [...] }, filePath }`. Forward relationships = what this note links to. Reverse relationships = what links to this note. If noteId not found, return NOT_FOUND error.
- [ ] **anvil_update_note:** Accepts `noteId` (required), `fields` (optional object of fields to update), `content` (optional body text to replace/append). Workflow: read existing note → merge updated fields → validate merged fields against type schema (strict mode) → update `modified` timestamp → write file → re-index → return `{ noteId, updatedFields: [...] }`.
- [ ] **anvil_update_note append_only enforcement:** If the note's type has `append_only: true` (e.g., journal), the `content` parameter only appends to the body — never replaces or modifies existing content. Frontmatter fields can still be updated normally. Attempting to replace body content on an append_only type returns an error.
- [ ] **anvil_update_note immutable fields:** Fields marked `immutable: true` in the type schema (e.g., noteId, created) reject update attempts with a clear error.
- [ ] **Partial updates:** `anvil_update_note` only modifies the fields provided. Omitted fields retain their current values. This is a PATCH, not a PUT.
- [ ] **Error handling:** All three tools return structured errors (VALIDATION_ERROR, NOT_FOUND, TYPE_NOT_FOUND) with consistent format. Network/IO errors are caught and wrapped in a generic SERVER_ERROR.
- [ ] **Unit tests:** Create with all field types, create with template on/off, create with validation failure, get existing note, get non-existent note, update single field, update multiple fields, update immutable field (should fail), update append_only body (should append), partial update preserves untouched fields.
- [ ] **Integration test:** Full round-trip: create → get (verify content matches) → update (change status) → get (verify update persisted) → verify index reflects changes.

## Technical Notes

**Key files to create:**
- `src/index.ts` — MCP server entry point, tool registration
- `src/config.ts` — Configuration loader (vault path from CLI args, env var, or config file)
- `src/tools/create-note.ts` — anvil_create_note handler
- `src/tools/get-note.ts` — anvil_get_note handler
- `src/tools/update-note.ts` — anvil_update_note handler

**Design references:**
- MCP tool signatures: §9 of Phase 1 design doc
- Template application: §1 of Phase 1 design doc
- Append-only behavior: §1 of Phase 1 design doc (journal type)

**Implementation notes:**
- Each tool handler is a function that receives parsed input and returns a typed response. The MCP SDK handles JSON-RPC transport.
- Tool input schemas are defined as Zod schemas (from story 002) and registered with the MCP SDK for automatic validation and schema advertisement.
- The `append_only` check should be in the update tool handler, not the validator — it's a behavioral constraint, not a field validation rule.
- For `anvil_get_note`, the reverse relationships query is: `SELECT * FROM relationships WHERE target_id = ?`. This needs the relationship index from story 004.

## Dependencies

- **001** — Type registry (validation, template lookup)
- **002** — Core types (Note, tool input/output schemas)
- **003** — File storage (read/write markdown)
- **004** — SQLite index (note upsert, relationship queries)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §1, §9 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
