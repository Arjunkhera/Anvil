// HTTP Streamable transport for MCP server
// Story 017: Implements HTTP transport with health endpoint and graceful shutdown

import * as http from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

const startTime = Date.now();

export interface HttpOptions {
  port: number;
  host: string;
}

/**
 * Log a message in JSON format to stderr
 */
function log(level: string, message: string, extra?: Record<string, unknown>) {
  const logEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  process.stderr.write(JSON.stringify(logEntry) + '\n');
}

/**
 * Start the MCP server using HTTP transport with StreamableHTTP protocol.
 * Features:
 * - /health endpoint returning server status and uptime
 * - Graceful shutdown on SIGTERM/SIGINT
 * - JSON logging to stderr
 */
export async function startHttp(server: Server, opts: HttpOptions): Promise<void> {
  const { port, host } = opts;

  // Create transport instance (stateless mode - no session management)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
  });

  // Create HTTP server
  const httpServer = http.createServer(async (req, res) => {
    // Handle health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const health = {
        status: 'ok',
        service: 'anvil',
        version: '2.0.0',
        uptime_seconds: uptime,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
      return;
    }

    // Route all other requests to MCP transport
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      log('error', 'HTTP request handling failed', {
        path: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  // Connect the server to the transport
  await server.connect(transport);

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    log('info', `Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      log('info', 'HTTP server closed');
      process.exit(0);
    });
    // Force exit after 5 seconds if graceful shutdown doesn't complete
    setTimeout(() => {
      log('warn', 'Forcing shutdown after timeout');
      process.exit(1);
    }, 5000);
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start listening
  return new Promise<void>((resolve, reject) => {
    httpServer.listen(port, host, () => {
      log('info', 'Anvil MCP HTTP server started', {
        host,
        port,
        url: `http://${host}:${port}`,
      });
      resolve();
    });
    httpServer.on('error', (error) => {
      log('error', 'HTTP server error', {
        error: error instanceof Error ? error.message : String(error),
      });
      reject(error);
    });
  });
}
