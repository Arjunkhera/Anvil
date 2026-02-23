# Scratch — 009: File Watcher

## 2026-02-23 — Story created

The file watcher is what makes Anvil feel alive — edits in any tool are reflected in the index automatically. The startup catchup is important for the stdio deployment model where the process dies between sessions.

Key concern: git pull handling. A `git pull` can change dozens of files at once. The debounce + batch processing should handle this naturally, but needs testing with realistic volumes.
