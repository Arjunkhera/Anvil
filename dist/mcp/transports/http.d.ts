import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface HttpOptions {
    port: number;
    host: string;
}
/**
 * Start the MCP server using HTTP transport with StreamableHTTP protocol.
 * Features:
 * - /health endpoint returning server status and uptime
 * - Graceful shutdown on SIGTERM/SIGINT
 * - JSON logging to stderr
 */
export declare function startHttp(server: Server, opts: HttpOptions): Promise<void>;
//# sourceMappingURL=http.d.ts.map