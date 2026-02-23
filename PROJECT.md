# Project: anvil-core

> Status: **active** | Created: 2026-02-22 | Program: [anvil-forge-vault](../../programs/anvil-forge-vault/PROGRAM.md)

## Overview

Anvil is the data layer and UI of the Anvil · Forge · Vault system. It is a personal notes and task management system where everything lives as markdown files with YAML frontmatter. Phase 1 delivers Anvil as a standalone, fully functional notes system with query-driven views, semantic search, and a fully operational MCP server.

## Goals

- [ ] Markdown file storage with YAML frontmatter indexing (SQLite-backed)
- [ ] Semantic search integration (full-text + vector embeddings)
- [ ] Conversational query → structured filter resolution
- [ ] View rendering: list, table, and board (kanban) at minimum
- [ ] Git sync — push/pull to remote, conflict resolution policy
- [ ] MCP server fully operational with all 7 tools exposed
- [ ] File watcher for live index updates on note changes

## Tech Stack

- **Language**: TypeScript (MCP server, index layer) + Python (semantic search / embedding service)
- **Framework**: MCP SDK (TypeScript), FastAPI or similar (Python embedding service)
- **Database**: SQLite (frontmatter index), vector store TBD (pgvector / ChromaDB / in-process)
- **Sync**: Git (libgit2 or shell-based, Phase 1)
- **Runtime**: Node.js (MCP server), Docker (optional for embedding service)
- **Package Manager**: npm (TypeScript), pip/uv (Python)
- **Test Framework**: Vitest (TypeScript), pytest (Python)

## Scope

**In scope for Phase 1:**
- Note CRUD (create, read, update, list, delete) via filesystem
- Frontmatter parsing and SQLite index
- Semantic search (content + metadata hybrid)
- Conversational query → structured filter (LLM-powered or keyword-mapping)
- View rendering engine (list, table, board)
- Git sync (manual trigger + configurable interval)
- MCP server (all 7 tools: search, get, create, update, query_view, list_types, get_related)
- File watcher for live re-indexing

**Out of scope for Phase 1:**
- Desktop app / GUI (Phase 3)
- Pluggable sync adapters (Phase 2)
- Multi-device conflict resolution beyond last-write-wins

## Data Model

Notes are markdown files with YAML frontmatter. Core schema:

```yaml
---
id: <uuid>
type: <note-type>          # task, story, project, scratch, meeting, person, etc.
title: "Human-readable title"
created: 2026-02-22T10:30:00Z
modified: 2026-02-22T14:15:00Z
tags: [personal, weekly-review]
status: open               # open, paused, completed, archived
priority: high             # high, medium, low
due: 2026-03-01
owner: "[[Person-Name]]"
project: "[[Project-Name]]"
related: ["[[Other-Note]]"]
scope:
  team: "Backend"
  service: "Document Service"
---
```

## MCP Tools (Target)

| Tool | Description |
|------|-------------|
| `anvil_search` | Search notes by content and/or metadata |
| `anvil_get_note` | Get full note content and metadata |
| `anvil_create_note` | Create a new note |
| `anvil_update_note` | Update note content or metadata |
| `anvil_query_view` | Execute a structured view query |
| `anvil_list_types` | List all note types and their schemas |
| `anvil_get_related` | Get notes linked to/from a given note |

## Status Summary

| Metric | Count |
|--------|-------|
| Total Stories | 13 |
| Draft | 13 |
| In Progress | 0 |
| Done | 0 |
| Blocked | 0 |

### Story Index

**Phase 1a — Foundation:**
- 001: Type Registry & Validation Engine [P1-high]
- 002: Core Data Model & TypeScript Types [P1-high]
- 003: File Storage Layer [P1-high]
- 004: SQLite Index [P1-high]

**Phase 1b — MCP Tools:**
- 005: Note CRUD MCP Tools [P1-high]
- 006: Search Tool [P1-high]
- 007: Query View Tool [P2-medium]
- 008: List Types & Get Related Tools [P2-medium]

**Phase 1c — Operational:**
- 009: File Watcher [P2-medium]
- 010: Git Sync [P2-medium]
- 011: Filter Builder [P2-medium]

**Phase 1d — Polish:**
- 012: Migration Tooling [P3-low]
- 013: Integration Tests & Documentation [P2-medium]

## Open Questions (Resolved)

1. ~~**Note ID generation:** UUID in frontmatter vs content-addressable hash vs slug-based?~~ **→ UUID v4 in frontmatter (`noteId`)**
2. ~~**Conflict resolution in Git sync:** Last-write-wins for frontmatter — is Git merge sufficient?~~ **→ Git merge (fast-forward preferred), conflicts surfaced to user**
3. ~~**Conversational query model:** Keyword-to-filter mapping vs LLM-powered resolution for v1?~~ **→ Pattern-based filter builder for Phase 1, LLM-powered in Phase 2**
4. ~~**Vector store choice:** In-process (ChromaDB/LanceDB) vs Docker-based (pgvector)?~~ **→ sqlite-vec (in-process, Phase 1.5)**
5. ~~**Offline-first for Forge:** Cache strategy when Vault service is unreachable?~~ **→ Deferred to Phase 3 (desktop app)**

## Links

- Program: [anvil-forge-vault](../../programs/anvil-forge-vault/PROGRAM.md)
- Repository: `/Users/arkhera/Desktop/Repositories/Anvil`
- Architecture: [Anvil · Forge · Vault Architecture Vision](../../Anvil-Forge-Vault-Architecture.md)
- **Phase 1 Design**: [Anvil Phase 1 — Full Design](docs/anvil-phase1-design.md)

---
*This is a living document. Updated by the project skill on status changes.*
