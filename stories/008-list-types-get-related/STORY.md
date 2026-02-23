# Story: List Types & Get Related Tools

> ID: 008 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Implement the remaining two MCP tools: `anvil_list_types` (list all registered types and their schemas) and `anvil_get_related` (get all notes linked to/from a given note). These are the discovery and navigation tools — agents use `list_types` to understand what types are available before creating notes, and `get_related` to traverse the note graph.

## Acceptance Criteria

- [ ] **anvil_list_types:** No required inputs. Returns an array of all registered types, each with: `{ typeId, name, description, icon, extends (parent type id or null), fields: [{ name, type, required, default, values (for enums), ref_type (for references) }], behaviors: { append_only } }`. Fields include both inherited and own fields, clearly merged. The response should be comprehensive enough for an agent to construct valid `anvil_create_note` calls without any other documentation.
- [ ] **anvil_list_types field detail:** Each field in the response includes its full definition — type, required, default value, validation constraints (min, max, pattern, allowed values). An agent receiving this response should know exactly what values are valid for each field.
- [ ] **anvil_list_types ordering:** Types are sorted alphabetically by typeId. Fields within each type are sorted: core fields first (in a fixed order: noteId, type, title, created, modified, tags, related, scope), then type-specific fields alphabetically.
- [ ] **anvil_get_related:** Accepts `noteId` (required). Returns: `{ noteId, title, type, forward: [...], reverse: [...] }`. Forward = relationships where this note is the source. Reverse = relationships where this note is the target. Each relationship entry includes: `{ noteId (of the other note), title, type, relation (e.g., "assignee", "related", "mentions") }`.
- [ ] **anvil_get_related grouping:** Forward and reverse relationships are grouped by relation_type for readability. Example: `{ forward: { project: [{ noteId, title }], mentions: [{ noteId, title }] }, reverse: { assignee: [{ noteId, title }], mentions: [{ noteId, title }] } }`.
- [ ] **anvil_get_related unresolved references:** Forward references with NULL target_id are still returned, with `noteId: null` and `title: "<unresolved title>"` and `resolved: false`. This lets agents see what the note links to even if the target doesn't exist yet.
- [ ] **Error handling:** `anvil_get_related` with a non-existent noteId returns NOT_FOUND error. `anvil_list_types` with an empty registry (no types loaded) returns an empty array, not an error.
- [ ] **Unit tests:** list_types with multiple types including inheritance, get_related with all three relationship types, get_related with unresolved forward references, get_related with no relationships (empty forward/reverse).

## Technical Notes

**Key files to create:**
- `src/tools/list-types.ts` — anvil_list_types handler
- `src/tools/get-related.ts` — anvil_get_related handler

**Design references:**
- MCP tool signatures: §9 of Phase 1 design doc
- Relationship model (bidirectional resolution): §2 of Phase 1 design doc

**Implementation notes:**
- `list_types` reads from the in-memory type registry (populated in story 001). No SQLite query needed.
- `get_related` runs two queries: `SELECT * FROM relationships WHERE source_id = ?` (forward) and `SELECT * FROM relationships WHERE target_id = ?` (reverse). Join with `notes` table to get title and type for each related note.
- For unresolved forward references (target_id IS NULL), return the `target_title` from the relationships table directly.
- The grouped output format for `get_related` is more useful for agents than a flat list — they can quickly see "this note is assigned to 3 people" or "5 journal entries mention this project."

## Dependencies

- **001** — Type registry (for list_types)
- **004** — SQLite index (for get_related relationship queries)
- **005** — MCP server setup (tool registration pattern)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §2, §9 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
