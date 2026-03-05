// Lightweight MCP client for communicating with the shared QMD HTTP daemon.
// Manages session lifecycle (initialize + tools/call over JSON-RPC 2.0).

export interface QMDSearchResult {
  docid: string;
  file: string;
  title: string;
  score: number;
  context?: string;
  snippet: string;
}

export class QMDMcpClient {
  private readonly mcpUrl: string;
  sessionId: string | null = null;
  private requestId = 0;

  constructor(daemonUrl: string) {
    this.mcpUrl = daemonUrl.replace(/\/$/, '') + '/mcp';
  }

  /**
   * Call a QMD MCP tool (search, vector_search, deep_search).
   * Initializes the MCP session on first call; re-initializes on session failure.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<QMDSearchResult[]> {
    if (!this.sessionId) {
      await this.initialize();
    }
    try {
      return await this.doCallTool(name, args);
    } catch {
      // Session may have been invalidated (daemon restart). Re-initialize once.
      this.sessionId = null;
      await this.initialize();
      return await this.doCallTool(name, args);
    }
  }

  private nextId(): number {
    return ++this.requestId;
  }

  private async initialize(): Promise<void> {
    const res = await fetch(this.mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'anvil-qmd-client', version: '1.0' },
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`QMD daemon initialize failed: HTTP ${res.status}`);
    }

    this.sessionId = res.headers.get('mcp-session-id') ?? null;

    // Fire-and-forget initialized notification (required by MCP protocol)
    void this.sendNotification('notifications/initialized', {});
  }

  private async sendNotification(method: string, params: Record<string, unknown>): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    await fetch(this.mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    }).catch(() => {}); // Ignore notification errors
  }

  private async doCallTool(name: string, args: Record<string, unknown>): Promise<QMDSearchResult[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(this.mcpUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.nextId(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });

    if (!res.ok) {
      throw new Error(`QMD tool call failed: HTTP ${res.status}`);
    }

    const json = await res.json() as Record<string, unknown>;
    if (json['error']) {
      const err = json['error'] as Record<string, unknown>;
      throw new Error(`QMD RPC error: ${err['message'] ?? 'unknown'}`);
    }

    const result = (json['result'] ?? {}) as Record<string, unknown>;
    if (result['isError']) {
      throw new Error(`QMD tool "${name}" returned an error`);
    }

    const sc = (result['structuredContent'] ?? {}) as Record<string, unknown>;
    return (sc['results'] as QMDSearchResult[]) ?? [];
  }
}
