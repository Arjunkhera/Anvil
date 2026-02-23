# Scratch — 006: Search Tool

## 2026-02-23 — Story created

This is the primary discovery tool. The query-engine module created here is shared with story 007 (query views).

Design note: tag filtering uses AND semantics (all specified tags must be present). OR semantics can be added later if needed but AND is the common case ("show me notes tagged both urgent AND work").
