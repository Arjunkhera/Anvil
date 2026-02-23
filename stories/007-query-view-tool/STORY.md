# Story: Query View Tool

> ID: 007 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Implement the `anvil_query_view` MCP tool that returns structured view data (list, table, or board) for a given set of filters. Unlike `anvil_search` which is optimized for discovery, `anvil_query_view` is optimized for rendering — it returns data shaped for display as lists, sortable tables, or kanban boards.

Since Phase 1 has no desktop app, these views are returned as structured JSON that MCP clients render however they want (markdown tables, inline text, etc.). The view renderer consumes the same query engine as the search tool but shapes the output differently.

## Acceptance Criteria

- [ ] **anvil_query_view tool:** Accepts `view` (required, enum: "list" | "table" | "board"), `filters` (optional, same structure as anvil_search), `groupBy` (optional, field name — required for board view), `orderBy` (optional, field name + direction, default: modified desc), `columns` (optional, array of field names — used for table view), `limit` (optional, default 50, max 100), `offset` (optional).
- [ ] **List view:** Returns `{ view: "list", items: [{ noteId, title, type, status, priority, due, tags, modified }], total, limit, offset }`. Items are flat note summaries sorted by `orderBy`.
- [ ] **Table view:** Returns `{ view: "table", columns: ["title", "status", "due", ...], rows: [{ noteId, values: { title: "...", status: "...", due: "..." } }], total, limit, offset }`. Columns are either caller-specified or auto-determined from the note type (core fields + type-specific fields). Values are formatted for display (dates as ISO strings, references as titles).
- [ ] **Board view:** Returns `{ view: "board", groupBy: "status", columns: [{ id: "open", title: "Open", items: [...] }, { id: "in-progress", title: "In Progress", items: [...] }] }`. Each column is a group determined by the `groupBy` field's values. Column order follows the enum definition order (if groupBy field is an enum) or alphabetical (if not).
- [ ] **Board default columns:** For enum fields, all defined values appear as columns even if empty. This ensures the board shows all possible states, not just states with notes in them.
- [ ] **orderBy validation:** If the specified field doesn't exist, return an error. Support ascending/descending: `{ field: "due", direction: "asc" }`.
- [ ] **groupBy validation:** The `groupBy` field must exist on the queried notes' type. If filtering by a specific type, validate against that type's fields. If no type filter, only core fields are valid for groupBy.
- [ ] **Column auto-detection:** If `columns` is not specified for table view, auto-select: title + all type-specific fields for the filtered type, or title + status + priority + due + tags for mixed-type queries.
- [ ] **Unit tests:** List view with sorting, table view with custom columns, table view with auto-detected columns, board view grouped by status, board view grouped by priority, board with empty columns, pagination, orderBy validation, groupBy validation.

## Technical Notes

**Key files to create:**
- `src/tools/query-view.ts` — anvil_query_view tool handler
- `src/views/renderer.ts` — Transforms query results into list/table/board JSON

**Design references:**
- View rendering: §8 of Phase 1 design doc
- MCP tool signature: §9 of Phase 1 design doc

**Implementation notes:**
- The renderer takes raw query results (from the shared query engine) and reshapes them. The query engine doesn't know about views — it just returns filtered, sorted notes.
- For board view, execute the query without the groupBy field as a filter, then group the results in memory. This is simpler and fine for <100 results per board.
- Board column ordering from enum definition requires reading the type registry to get the enum values list and their order.
- Table column formatting: dates → ISO strings, references → target titles, tags → comma-separated strings, booleans → "Yes"/"No".

## Dependencies

- **002** — Core types (ViewData types)
- **004** — SQLite index (query execution)
- **005** — MCP server setup (tool registration pattern)
- **006** — Search tool (shared query engine)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §8, §9 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
