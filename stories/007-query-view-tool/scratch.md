# Scratch — 007: Query View Tool

## 2026-02-23 — Story created

The view renderer is the presentation layer — it takes query results and shapes them for display. In Phase 1, clients render the JSON themselves. In Phase 3, the desktop app will render these same structures as native UI components (kanban boards, data tables, etc.).

Board view column ordering: uses enum definition order from the type registry. This ensures statuses appear in a logical workflow order (open → in-progress → blocked → done) rather than alphabetical.
