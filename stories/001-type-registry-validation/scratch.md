# Scratch — 001: Type Registry & Validation Engine

## 2026-02-23 — Story created

Story created from Phase 1 design doc sections §1 (Type Registry & Templates) and §4 (SQLite Frontmatter Index — types table). This is the foundational story — everything else depends on knowing what types exist and how to validate their fields.

Key design decisions already resolved:
- Single inheritance only (max 3 levels)
- Strict enum validation (no fuzzy matching)
- Forward references allowed (warn, don't reject)
- Tag deduplication is automatic
