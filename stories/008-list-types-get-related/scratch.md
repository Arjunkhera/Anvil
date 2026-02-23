# Scratch — 008: List Types & Get Related Tools

## 2026-02-23 — Story created

These are the lighter tools — primarily read-only queries against the type registry and relationships table. list_types is especially important for agent UX — it's how agents discover what they can create and what fields are available.

Design choice: get_related groups relationships by relation_type rather than returning a flat list. This makes the response more semantically meaningful for agents.
