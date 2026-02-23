# Scratch — 012: Migration Tooling

## 2026-02-23 — Story created

This story handles the specific case of migrating Arjun's existing ~2700 file Obsidian vault into Anvil. The tooling should be general enough for any Obsidian vault but the default config should work for the known vault structure.

Key risk: dataview field conversion is lossy if the inline field format is ambiguous. The dry-run mode is critical — always preview before modifying.
