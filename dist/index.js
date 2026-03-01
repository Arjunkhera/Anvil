#!/usr/bin/env node
// Anvil MCP Server entry point
// Initializes core components and starts the MCP server with the configured transport
import { loadServerConfig, vaultPaths } from './config.js';
import { TypeRegistry } from './registry/type-registry.js';
import { AnvilDatabase } from './index/sqlite.js';
import { createMcpServer } from './mcp/server.js';
import { startStdio } from './mcp/transports/stdio.js';
import { startHttp } from './mcp/transports/http.js';
/**
 * Main entry point for the Anvil MCP server
 * 1. Loads configuration from CLI args, env vars, or config file
 * 2. Initializes core components (TypeRegistry, AnvilDatabase)
 * 3. Creates the MCP server with all tool handlers
 * 4. Starts the configured transport (stdio or http)
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
    // Create MCP server with all tool handlers
    const server = createMcpServer(ctx);
    // Determine transport and start server
    const transport = config.transport || 'stdio';
    const port = config.port || parseInt(process.env.ANVIL_PORT || '8100', 10);
    const host = config.host || process.env.ANVIL_HOST || '0.0.0.0';
    if (transport === 'http') {
        await startHttp(server, { port, host });
    }
    else {
        await startStdio(server);
    }
}
// Run the server
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map