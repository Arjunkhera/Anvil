# Scratch — 005: Note CRUD MCP Tools

## 2026-02-23 — Story created

This story is the first to touch the MCP server directly. It establishes the server entry point, config loading, and the tool registration pattern. All subsequent tool stories (006, 007, 008) follow the same pattern.

Design decision: anvil_update_note is a PATCH (partial update), not a PUT (full replace). This is more ergonomic for agents — they can say "set status to done" without re-sending every other field.
