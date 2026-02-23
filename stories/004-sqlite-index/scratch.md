# Scratch — 004: SQLite Index

## 2026-02-23 — Story created

Story created from Phase 1 design doc. This is the heaviest foundation story — it touches notes, tags, relationships, FTS, and the indexer pipeline.

Key design choice: using `better-sqlite3` (synchronous) rather than `sql.js` or async alternatives. Synchronous API is simpler and faster for a local single-user DB.

Note: WAL mode should be enabled for concurrent read access during writes. This is important for Phase 3 (multi-client HTTP) but good practice from the start.
