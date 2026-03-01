import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
/**
 * Start the MCP server using stdio transport.
 * The server communicates via stdin/stdout with the client.
 * Runs until the process exits.
 */
export declare function startStdio(server: Server): Promise<void>;
//# sourceMappingURL=stdio.d.ts.map