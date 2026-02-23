# CLAUDE.md — anvil

> Project-specific AI rules and learned patterns. This file is read by the developer and tester skills before any work.

## Project Context

- **Language**: TypeScript (MCP server + index layer), Python (embedding/semantic search service)
- **Framework**: MCP SDK (TypeScript), TBD for Python service
- **Package Manager**: npm (TypeScript), pip/uv (Python)
- **Test Framework**: Vitest (TypeScript), pytest (Python)
- **Runtime**: Node.js 20+, Python 3.12+

## Architecture Overview

Anvil has two primary components:

1. **MCP Server** (TypeScript) — Exposes 7 tools. Reads/writes markdown files. Queries the SQLite frontmatter index. Delegates semantic search to the embedding service.
2. **Index + Embedding Service** (Python or TypeScript TBD) — Watches the notes directory. Parses frontmatter into SQLite. Generates embeddings for semantic search. Handles hybrid query routing.

The filesystem is the source of truth. The SQLite index is a derived artifact — it can always be rebuilt from the files.

## Coding Rules

1. **Filesystem is source of truth** — Never treat the SQLite index as canonical. If index and file disagree, the file wins. Index can always be rebuilt.
2. **Frontmatter must stay valid YAML** — Any code that modifies frontmatter must re-serialize cleanly. Never do string manipulation on raw frontmatter.
3. **IDs are immutable** — Once assigned, a note's `id` never changes, even if the file is renamed or moved.
4. **MCP tools must be idempotent where possible** — `anvil_create_note` with same id should update, not duplicate.
5. **File watcher must be debounced** — Batch rapid successive changes before re-indexing.
6. **No silent failures** — All MCP tools return structured errors with meaningful messages.

## Patterns to Follow

- Use the MCP SDK's tool registration pattern — define schema with Zod, implement handler, register together.
- Parse frontmatter with `gray-matter` (TypeScript) — don't roll custom YAML parsers.
- Use parameterized queries for all SQLite operations — no string interpolation in SQL.
- Keep MCP tool handlers thin — they delegate to a service layer. Business logic lives in services, not in tool handlers.
- Each service has a corresponding test file with unit + integration tests.

## Patterns to Avoid

- Don't use `any` types in TypeScript — use proper types or unknown + type guards.
- Don't store absolute paths in frontmatter — always use paths relative to the notes root.
- Don't build conversational query resolution as a giant if-else tree — use a filter builder pattern.
- Don't embed the vector store in the MCP server process — keep it as a separate addressable service.

## Learned Mistakes

<!-- Append mistakes the AI has made here so they are not repeated -->

## Common Commands

```bash
# Build (TypeScript MCP server)
npm run build

# Test
npm run test

# Lint
npm run lint

# Start MCP server (dev mode)
npm run dev

# Rebuild SQLite index from scratch
npm run index:rebuild

# Run Python embedding service
uv run python -m anvil_embed.server
```

## File Structure (Target)

See `docs/anvil-phase1-design.md` § 11 for full repo layout. Key directories:

```
src/
  index.ts              # MCP server entry point
  config.ts             # Configuration loader (reads vault path)
  setup.ts              # `anvil init` — vault setup
  types/                # TypeScript type definitions
  registry/             # Type registry & field validation engine
  storage/              # File I/O & watcher
  index/                # SQLite adapter, FTS5, indexer pipeline
  search/               # Filter builder & query engine
  views/                # List/table/board JSON renderers
  sync/                 # Git pull/push
  tools/                # MCP tool implementations (one per file)
defaults/               # Default type templates (copied to vault on init)
tests/
  unit/
  integration/
  fixtures/test-vault/
```

## Note Types (Anvil Type System)

Built-in types shipped with Anvil. Defined as YAML in the vault's `.anvil/types/`:

| Type | Key Behavior |
|------|-------------|
| `note` | Generic, no extra fields |
| `task` | Status, priority, due, effort, assignee |
| `project` | Container for related work |
| `story` | SDLC work item (extends task) |
| `person` | Contact / team member |
| `service` | Software service |
| `meeting` | Date, attendees, action items |
| `journal` | **Append-only** — entries are timestamped, never edited |

Types support single inheritance (max 3 levels). Enum validation is strict (reject invalid values). See `docs/anvil-phase1-design.md` § 1 for full details.
