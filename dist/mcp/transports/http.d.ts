import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
export interface HttpOptions {
    port: number;
    host: string;
}
/**
 * Start the MCP server using HTTP transport with StreamableHTTP protocol.
 * Supports multiple concurrent sessions via per-session transport instances.
 * Features:
 * - /health endpoint returning server status and uptime
 * - Per-session transport routing (new session per initialize request)
 * - Graceful shutdown on SIGTERM/SIGINT
 * - JSON logging to stderr
 */
export declare function startHttp(serverFactory: () => Server, opts: HttpOptions): Promise<void>;
//# sourceMappingURL=http.d.ts.map