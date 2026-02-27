#!/usr/bin/env node
// Anvil MCP Server entry point
// Implements the Model Context Protocol for vault operations
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { loadServerConfig, vaultPaths } from './config.js';
import { TypeRegistry } from './registry/type-registry.js';
import { AnvilDatabase } from './index/sqlite.js';
import { handleCreateNote } from './tools/create-note.js';
import { handleGetNote } from './tools/get-note.js';
import { handleUpdateNote } from './tools/update-note.js';
import { handleSearch } from './tools/search.js';
import { handleQueryView } from './tools/query-view.js';
import { handleListTypes } from './tools/list-types.js';
import { handleGetRelated } from './tools/get-related.js';
import { handleSyncPull } from './tools/sync-pull.js';
import { handleSyncPush } from './tools/sync-push.js';
import { CreateNoteInputSchema, GetNoteInputSchema, UpdateNoteInputSchema, SearchInputSchema, QueryViewInputSchema, SyncPullInputSchema, SyncPushInputSchema, } from './types/tools.js';
import { isAnvilError, makeError } from './types/error.js';
/**
 * Main entry point for the Anvil MCP server
 */
async function main() {
    // Load configuration
    const config = loadServerConfig(process.argv.slice(2));
    if (!config.vault_path) {
        console.error('Error: vault_path not configured. Use --vault, ANVIL_VAULT_PATH env var, or ~/.anvil/server.yaml');
        process.exit(1);
    }
    // Get vault paths
    const paths = vaultPaths(config.vault_path);
    // Initialize TypeRegistry
    const registry = new TypeRegistry();
    const typeLoadErr = await registry.loadTypes(paths.typesDir);
    if (typeLoadErr && 'error' in typeLoadErr) {
        console.error(`Failed to load types: ${typeLoadErr.message}`);
        process.exit(1);
    }
    // Initialize AnvilDatabase
    const db = AnvilDatabase.create(paths.indexDb);
    // Cache types in database
    for (const type of registry.getAllTypes()) {
        db.upsertType(type);
    }
    // Create tool context
    const ctx = {
        vaultPath: config.vault_path,
        registry,
        db,
    };
    // Create MCP server
    const server = new Server({
        name: 'anvil',
        version: '0.1.0',
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Define tool schemas
    const tools = [
        {
            name: 'anvil_create_note',
            description: 'Create a new note in the vault with automatic ID, timestamps, and type validation',
            inputSchema: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        description: 'Note type ID (e.g., task, note, journal, story)',
                    },
                    title: {
                        type: 'string',
                        description: 'Note title (1-300 characters)',
                    },
                    content: {
                        type: 'string',
                        description: 'Optional markdown body content',
                    },
                    fields: {
                        type: 'object',
                        description: 'Type-specific frontmatter fields',
                    },
                    use_template: {
                        type: 'boolean',
                        description: 'Apply type template (default: true)',
                        default: true,
                    },
                },
                required: ['type', 'title'],
            },
        },
        {
            name: 'anvil_get_note',
            description: 'Retrieve a note by ID with full metadata and body content',
            inputSchema: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'UUID of the note to retrieve',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'anvil_update_note',
            description: 'Update a note (PATCH semantics for fields, append or replace for body)',
            inputSchema: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'UUID of the note to update',
                    },
                    fields: {
                        type: 'object',
                        description: 'Fields to update (omitted fields are preserved)',
                    },
                    content: {
                        type: 'string',
                        description: 'New body content (appends for journals, replaces otherwise)',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'anvil_search',
            description: 'Search notes by free-text query and/or structured filters. Supports FTS, type filtering, tags (AND semantics), and date ranges.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Free-text search query (supports FTS5 syntax)',
                    },
                    type: {
                        type: 'string',
                        description: 'Filter by note type',
                    },
                    status: {
                        type: 'string',
                        description: 'Filter by status',
                    },
                    priority: {
                        type: 'string',
                        description: 'Filter by priority',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter by tags (notes must have ALL specified tags)',
                    },
                    due: {
                        type: 'object',
                        properties: {
                            gte: {
                                type: 'string',
                                description: 'Due date >= this ISO date',
                            },
                            lte: {
                                type: 'string',
                                description: 'Due date <= this ISO date',
                            },
                        },
                        description: 'Due date range filter (ISO date strings)',
                    },
                    assignee: {
                        type: 'string',
                        description: 'Filter by assignee',
                    },
                    project: {
                        type: 'string',
                        description: 'Filter by project',
                    },
                    scope: {
                        type: 'object',
                        properties: {
                            context: {
                                type: 'string',
                                enum: ['personal', 'work'],
                                description: 'Scope context filter',
                            },
                            team: {
                                type: 'string',
                                description: 'Scope team filter',
                            },
                            service: {
                                type: 'string',
                                description: 'Scope service filter',
                            },
                        },
                        description: 'Scope-based filters',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum results to return (1-100, default: 20)',
                        default: 20,
                    },
                    offset: {
                        type: 'number',
                        description: 'Pagination offset (default: 0)',
                        default: 0,
                    },
                },
            },
        },
        {
            name: 'anvil_query_view',
            description: 'Query notes with structured filters and render as list, table, or board (kanban) view. Auto-detects columns for table view.',
            inputSchema: {
                type: 'object',
                required: ['view'],
                properties: {
                    view: {
                        type: 'string',
                        enum: ['list', 'table', 'board'],
                        description: 'View type to render',
                    },
                    filters: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Free-text search query',
                            },
                            type: {
                                type: 'string',
                                description: 'Filter by note type',
                            },
                            status: {
                                type: 'string',
                                description: 'Filter by status',
                            },
                            priority: {
                                type: 'string',
                                description: 'Filter by priority',
                            },
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Filter by tags (AND semantics)',
                            },
                            due: {
                                type: 'object',
                                properties: {
                                    gte: { type: 'string' },
                                    lte: { type: 'string' },
                                },
                                description: 'Due date range filter',
                            },
                            assignee: {
                                type: 'string',
                                description: 'Filter by assignee',
                            },
                            project: {
                                type: 'string',
                                description: 'Filter by project',
                            },
                            scope: {
                                type: 'object',
                                description: 'Scope-based filters',
                            },
                        },
                        description: 'Query filters (all optional)',
                    },
                    groupBy: {
                        type: 'string',
                        description: 'Field to group by — required for board view',
                    },
                    orderBy: {
                        type: 'object',
                        properties: {
                            field: { type: 'string' },
                            direction: { type: 'string', enum: ['asc', 'desc'] },
                        },
                        description: 'Sort order (default: modified desc)',
                    },
                    columns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Column names for table view (auto-detected if omitted)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum results to return (1-100, default: 50)',
                        default: 50,
                    },
                    offset: {
                        type: 'number',
                        description: 'Pagination offset (default: 0)',
                        default: 0,
                    },
                },
            },
        },
        {
            name: 'anvil_list_types',
            description: 'List all available note types with their schemas and templates',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'anvil_get_related',
            description: 'Get notes related to a given note (forward and reverse relationships)',
            inputSchema: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'UUID of the note',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'anvil_sync_pull',
            description: 'Pull latest changes from the remote Git repository and re-index changed files',
            inputSchema: {
                type: 'object',
                properties: {
                    remote: {
                        type: 'string',
                        description: 'Remote name (default: "origin")',
                    },
                    branch: {
                        type: 'string',
                        description: 'Branch to pull (default: current branch)',
                    },
                },
            },
        },
        {
            name: 'anvil_sync_push',
            description: 'Stage vault changes, commit, and push to the remote Git repository',
            inputSchema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'Commit message',
                    },
                },
                required: ['message'],
            },
        },
    ];
    // Register ListTools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools,
    }));
    // Register CallTool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            switch (name) {
                case 'anvil_create_note': {
                    const input = CreateNoteInputSchema.parse(args);
                    const result = await handleCreateNote(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_get_note': {
                    const input = GetNoteInputSchema.parse(args);
                    const result = handleGetNote(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_update_note': {
                    const input = UpdateNoteInputSchema.parse(args);
                    const result = await handleUpdateNote(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_search': {
                    const input = SearchInputSchema.parse(args);
                    const result = await handleSearch(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_query_view': {
                    const input = QueryViewInputSchema.parse(args);
                    const result = await handleQueryView(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_list_types': {
                    const result = handleListTypes(ctx);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_get_related': {
                    const input = args;
                    const result = handleGetRelated(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(result),
                                },
                            ],
                            isError: true,
                        };
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(result),
                            },
                        ],
                    };
                }
                case 'anvil_sync_pull': {
                    const input = SyncPullInputSchema.parse(args);
                    const result = await handleSyncPull(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result) }],
                            isError: true,
                        };
                    }
                    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
                }
                case 'anvil_sync_push': {
                    const input = SyncPushInputSchema.parse(args);
                    const result = await handleSyncPush(input, ctx);
                    if (isAnvilError(result)) {
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result) }],
                            isError: true,
                        };
                    }
                    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
                }
                default:
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify(makeError('SERVER_ERROR', `Unknown tool: ${name}`)),
                            },
                        ],
                        isError: true,
                    };
            }
        }
        catch (err) {
            const error = err instanceof Error ? err.message : `${typeof err}: ${String(err)}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(makeError('SERVER_ERROR', `Tool call failed: ${error}`)),
                    },
                ],
                isError: true,
            };
        }
    });
    // Connect stdio transport and start
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
// Run the server
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map