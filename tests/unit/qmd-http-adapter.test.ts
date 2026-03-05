// Unit tests for QMDAdapter in HTTP daemon mode.
// Spins up a minimal MCP-compatible HTTP server to verify the adapter routes
// search/vector/hybrid calls correctly and falls back gracefully.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import { QMDAdapter } from '../../src/core/search/qmd-adapter.js';

// ── Minimal fake MCP server ─────────────────────────────────────────────────

function startFakeMcpServer(
  port: number,
  toolHandler: (name: string, args: Record<string, unknown>) => unknown[]
): { server: Server; calls: Array<{ name: string; args: Record<string, unknown> }> } {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let reqId = 0;

  const server = createServer((req, res) => {
    if (req.url !== '/mcp' || req.method !== 'POST') {
      res.writeHead(404);
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
      const method = body['method'] as string;

      if (method === 'initialize') {
        const sessionId = `sess-${++reqId}`;
        res.writeHead(200, { 'Content-Type': 'application/json', 'Mcp-Session-Id': sessionId });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: body['id'], result: { protocolVersion: '2024-11-05', capabilities: {} } }));
        return;
      }

      if (method === 'notifications/initialized') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
        return;
      }

      if (method === 'tools/call') {
        const params = body['params'] as Record<string, unknown>;
        const toolName = params['name'] as string;
        const toolArgs = params['arguments'] as Record<string, unknown>;
        calls.push({ name: toolName, args: toolArgs });

        const results = toolHandler(toolName, toolArgs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: body['id'],
          result: { content: [{ type: 'text', text: `${results.length} results` }], structuredContent: { results } },
        }));
        return;
      }

      res.writeHead(404);
      res.end();
    });
  });

  server.listen(port);
  return { server, calls };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('QMDAdapter HTTP daemon mode', () => {
  let server: Server;
  let calls: Array<{ name: string; args: Record<string, unknown> }>;
  let adapter: QMDAdapter;
  let port: number;

  const fakeResult = { docid: '#abc', file: 'anvil/note.md', title: 'Test Note', score: 0.9, snippet: 'test snippet' };

  beforeEach(async () => {
    const fake = startFakeMcpServer(0, (name, args) => { // port 0 = random free port
      void name; void args;
      return [fakeResult];
    });
    server = fake.server;
    calls = fake.calls;
    // Wait for server to be listening and get the assigned port
    await new Promise<void>((resolve) => {
      if (server.listening) { resolve(); return; }
      server.once('listening', resolve);
    });
    port = (server.address() as { port: number }).port;
    adapter = new QMDAdapter({ collectionName: 'anvil', daemonUrl: `http://localhost:${port}` });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('routes query() to deep_search tool with correct args', async () => {
    const results = await adapter.query('knowledge management', { limit: 5 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.name).toBe('deep_search');
    expect(calls[0]!.args).toMatchObject({ query: 'knowledge management', collection: 'anvil', limit: 5 });
    expect(results[0]!.score).toBe(0.9);
    expect(results[0]!.file).toBe('anvil/note.md');
  });

  it('routes search() to search tool', async () => {
    await adapter.search('anvil notes', { limit: 10 });
    expect(calls[0]!.name).toBe('search');
    expect(calls[0]!.args).toMatchObject({ query: 'anvil notes', collection: 'anvil', limit: 10 });
  });

  it('routes similar() to vector_search tool', async () => {
    await adapter.similar('semantic meaning');
    expect(calls[0]!.name).toBe('vector_search');
    expect(calls[0]!.args).toMatchObject({ query: 'semantic meaning', collection: 'anvil' });
  });

  it('normalizes results to SearchResult format', async () => {
    const results = await adapter.query('test');
    expect(results[0]).toMatchObject({ score: 0.9, file: 'anvil/note.md', snippet: 'test snippet' });
    // noteId should be the file path (resolved later by the search handler)
    expect(results[0]!.noteId).toBe('anvil/note.md');
  });

  it('returns empty array when daemon returns no results', async () => {
    const emptyFake = startFakeMcpServer(0, () => []);
    await new Promise<void>((resolve) => {
      if (emptyFake.server.listening) { resolve(); return; }
      emptyFake.server.once('listening', resolve);
    });
    const emptyPort = (emptyFake.server.address() as { port: number }).port;
    const emptyAdapter = new QMDAdapter({ collectionName: 'anvil', daemonUrl: `http://localhost:${emptyPort}` });
    const results = await emptyAdapter.query('nothing');
    expect(results).toHaveLength(0);
    await new Promise<void>((resolve) => emptyFake.server.close(() => resolve()));
  });

  it('preserves collection namespacing', async () => {
    const customAdapter = new QMDAdapter({ collectionName: 'custom', daemonUrl: `http://localhost:${port}` });
    await customAdapter.query('test');
    expect(calls[0]!.args['collection']).toBe('custom');
  });
});

describe('QMDAdapter.isAvailable() with daemon URL', () => {
  it('returns true when QMD_DAEMON_URL is set, skipping subprocess probe', async () => {
    const original = process.env['QMD_DAEMON_URL'];
    process.env['QMD_DAEMON_URL'] = 'http://localhost:8181';
    try {
      const available = await QMDAdapter.isAvailable();
      expect(available).toBe(true);
    } finally {
      if (original === undefined) delete process.env['QMD_DAEMON_URL'];
      else process.env['QMD_DAEMON_URL'] = original;
    }
  });

  it('returns false when qmd binary is not found and no daemon URL', async () => {
    const available = await QMDAdapter.isAvailable('/nonexistent/qmd-binary');
    expect(available).toBe(false);
  });
});
