# Anvil Core

Anvil Core is a TypeScript MCP (Model Context Protocol) server that transforms a markdown vault into a queryable, type-enforced note-taking system. It provides a complete knowledge management system with full-text search, relationships, and structured data.

## Features

- **7 MCP Tools**: Create, get, and update notes; search; query views; list types; get relationships; git sync (pull/push)
- **Type System**: Inheritance-based type definitions with field validation
- **Full-Text Search**: SQLite FTS5 integration for fast, powerful search
- **Relationships**: Automatic wiki-link parsing and relationship tracking
- **File Watcher**: Automatic re-indexing on vault changes
- **Git Sync**: Pull and push notes to/from git repositories
- **Migration Tools**: Convert Obsidian vaults with automatic type inference

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Run tests**:
   ```bash
   npm test
   npx vitest run  # Run once and exit
   ```

4. **Configure MCP client**: Set up Claude Desktop (or other MCP client) with the configuration from [Setup Guide](docs/setup.md)

5. **Create your first note**:
   Use the `anvil_create_note` tool to add a task or note to your vault.

## Tech Stack

- **Language**: TypeScript (ESM)
- **Runtime**: Node.js 18+
- **Database**: better-sqlite3 (synchronous SQLite)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Validation**: Zod (runtime type checking)
- **Git**: simple-git (git operations)
- **YAML**: js-yaml (type definitions)

## Project Structure

```
anvil-core/
├── src/
│   ├── index/          # SQLite indexing, FTS5, full-rebuild
│   ├── registry/       # Type definitions & validation
│   ├── storage/        # File I/O, wiki-links, slug generation
│   ├── tools/          # MCP tool handlers (create, get, update, search, etc.)
│   ├── sync/           # Git operations (pull/push)
│   ├── migration/      # Obsidian vault conversion
│   └── types/          # TypeScript type definitions
├── defaults/           # Built-in type definitions (.yaml files)
├── tests/
│   ├── unit/           # Unit tests for modules
│   ├── integration/    # Integration tests for end-to-end workflows
│   └── fixtures/       # Test vault with sample files
├── docs/               # Documentation
└── package.json
```

## Documentation

- **[Setup Guide](docs/setup.md)**: Installation and MCP client configuration
- **[MCP Tools Reference](docs/tools.md)**: Complete API documentation for all 7 tools
- **[Type Authoring Guide](docs/types.md)**: How to create custom note types

## Development

### Build
```bash
npm run build    # Compile TypeScript to dist/
```

### Test
```bash
npm test         # Run all tests (watch mode)
npx vitest run   # Run tests once and exit
npx vitest run tests/integration/  # Run integration tests only
```

### Code Structure

The project is organized into modules:

- **src/index/**: Database management and indexing
  - `sqlite.ts`: AnvilDatabase wrapper
  - `indexer.ts`: CRUD operations (upsertNote, deleteNote, fullRebuild)
  - `fts.ts`: Full-text search with FTS5
  - `migrations/`: Database schema

- **src/registry/**: Type system
  - `type-registry.ts`: Load and resolve type inheritance
  - `validator.ts`: Zod-based validation

- **src/storage/**: File operations
  - `file-store.ts`: Read/write markdown files
  - `frontmatter.ts`: YAML frontmatter parsing
  - `wiki-links.ts`: Extract wiki-links from content
  - `slug.ts`: Generate URL-safe slugs
  - `watcher.ts`: File system watching

- **src/tools/**: MCP tool implementations
  - `create-note.ts`: Tool handler + ToolContext type
  - `get-note.ts`, `update-note.ts`: CRUD
  - `search.ts`: Full-text search
  - `query-view.ts`: Complex queries with views
  - `list-types.ts`, `get-related.ts`: Metadata
  - `sync-pull.ts`, `sync-push.ts`: Git operations

## Architecture

The system uses a **multi-layer architecture**:

1. **File Layer**: Markdown files in the vault directory, with YAML frontmatter
2. **Index Layer**: SQLite database for fast lookup and search
3. **Sync Layer**: Git integration for version control
4. **Tool Layer**: MCP handlers that coordinate file and index operations

When a note is created:
1. Frontmatter is validated against type schema
2. Note is written to filesystem
3. Note is indexed in SQLite with FTS
4. Wiki-links are parsed and relationships are created

## Error Handling

All MCP tools return either:
- A successful response (typed interface)
- An `AnvilError` with structured error information

Error codes:
- `VALIDATION_ERROR`: Note failed schema validation
- `TYPE_NOT_FOUND`: Type definition doesn't exist
- `NOT_FOUND`: Note not found
- `IMMUTABLE_FIELD`: Cannot modify immutable field
- `APPEND_ONLY`: Type has append-only behavior
- `SYNC_ERROR`: Git operation failed
- `SERVER_ERROR`: Unexpected error

## Contributing

When adding new features:
1. Add unit tests in `tests/unit/`
2. Add integration tests in `tests/integration/` if E2E workflow
3. Update relevant documentation in `docs/`
4. Ensure all tests pass: `npm test`

## License

TBD
