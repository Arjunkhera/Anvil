# Scratch — 010: Git Sync

## 2026-02-23 — Story created

Manual sync only in Phase 1. Auto-sync (interval-based) comes in Phase 3 with the persistent desktop app.

Design choice: push combines stage + commit + push into a single tool call. This is more ergonomic for agents than separate operations. The trade-off is less granular control, but for a personal notes system, "save and sync my changes" is the common use case.
