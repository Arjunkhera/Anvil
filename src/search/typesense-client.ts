// Typesense search client with graceful degradation
// Wraps the Typesense JS SDK for document search, upsert, and collection management

import Typesense from 'typesense';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TypesenseClientConfig = {
  host: string;
  port: number;
  apiKey: string;
  protocol?: string;
  collectionName?: string;
};

export type TypesenseDocument = {
  id: string;
  source: string;
  source_type: string;
  title: string;
  body: string;
  tags: string[];
  status?: string;
  priority?: string;
  assignee_id?: string;
  project_id?: string;
  project_name?: string;
  due_at?: number;
  mode?: string;
  scope_repo?: string;
  scope_program?: string;
  scope_context?: string;
  vault_name?: string;
  created_at: number;
  modified_at: number;
};

export type TypesenseSearchQuery = {
  q: string;
  query_by: string;
  filter_by?: string;
  sort_by?: string;
  per_page?: number;
  page?: number;
  highlight_fields?: string;
  snippet_threshold?: number;
};

export type TypesenseSearchResult = {
  id: string;
  score: number;
  snippet: string;
  document: TypesenseDocument;
};

export type TypesenseSearchResponse = {
  results: TypesenseSearchResult[];
  total: number;
  search_unavailable?: boolean;
};

// ─── Collection schema ──────────────────────────────────────────────────────

export const COLLECTION_NAME_DEFAULT = 'horus_documents';

export const COLLECTION_SCHEMA = {
  name: COLLECTION_NAME_DEFAULT,
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'source', type: 'string' as const, facet: true },
    { name: 'source_type', type: 'string' as const, facet: true },
    { name: 'title', type: 'string' as const },
    { name: 'body', type: 'string' as const },
    { name: 'tags', type: 'string[]' as const, facet: true },
    { name: 'status', type: 'string' as const, facet: true, optional: true },
    { name: 'priority', type: 'string' as const, facet: true, optional: true },
    { name: 'assignee_id', type: 'string' as const, facet: true, optional: true },
    { name: 'project_id', type: 'string' as const, facet: true, optional: true },
    { name: 'project_name', type: 'string' as const, facet: true, optional: true },
    { name: 'due_at', type: 'int64' as const, optional: true },
    { name: 'mode', type: 'string' as const, facet: true, optional: true },
    { name: 'scope_repo', type: 'string' as const, facet: true, optional: true },
    { name: 'scope_program', type: 'string' as const, facet: true, optional: true },
    { name: 'scope_context', type: 'string' as const, facet: true, optional: true },
    { name: 'vault_name', type: 'string' as const, facet: true, optional: true },
    { name: 'created_at', type: 'int64' as const },
    { name: 'modified_at', type: 'int64' as const, sort: true },
  ],
  default_sorting_field: 'modified_at',
};

// ─── Filter builder ─────────────────────────────────────────────────────────

/**
 * Convert a structured filter object to Typesense filter_by string syntax.
 * Handles exact match, array membership, and numeric range filters.
 */
export function buildFilterBy(
  filters: Record<string, unknown>
): string {
  const clauses: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Array filter: field:=[val1, val2, ...]
      if (value.length > 0) {
        const escaped = value.map((v) => `\`${String(v)}\``).join(', ');
        clauses.push(`${key}:=[${escaped}]`);
      }
    } else if (typeof value === 'object') {
      // Range filter: { gte?, lte? }
      const range = value as { gte?: number; lte?: number };
      if (range.gte !== undefined) {
        clauses.push(`${key}:>=${range.gte}`);
      }
      if (range.lte !== undefined) {
        clauses.push(`${key}:<=${range.lte}`);
      }
    } else {
      // Exact match
      clauses.push(`${key}:=\`${String(value)}\``);
    }
  }

  return clauses.join(' && ');
}

// ─── Client class ───────────────────────────────────────────────────────────

/**
 * Typesense search client with graceful degradation.
 * All search operations return `{ search_unavailable: true }` on connection errors
 * rather than throwing, so callers can fall back to FTS5.
 */
export class TypesenseSearchClient {
  private client: Typesense.Client;
  private collectionName: string;

  constructor(config: TypesenseClientConfig) {
    this.collectionName = config.collectionName ?? COLLECTION_NAME_DEFAULT;
    this.client = new Typesense.Client({
      nodes: [
        {
          host: config.host,
          port: config.port,
          protocol: config.protocol ?? 'http',
        },
      ],
      apiKey: config.apiKey,
      connectionTimeoutSeconds: 3,
      retryIntervalSeconds: 0.5,
      numRetries: 1,
    });
  }

  /**
   * Search the collection with the given query parameters.
   * Returns `{ search_unavailable: true }` on connection errors.
   */
  async search(query: TypesenseSearchQuery): Promise<TypesenseSearchResponse> {
    try {
      const searchResult = await this.client
        .collections(this.collectionName)
        .documents()
        .search(query);

      const results: TypesenseSearchResult[] = (searchResult.hits ?? []).map(
        (hit: any) => ({
          id: hit.document.id,
          score: hit.text_match_info?.score ?? hit.text_match ?? 0,
          snippet: extractSnippet(hit.highlights),
          document: hit.document as TypesenseDocument,
        })
      );

      return {
        results,
        total: searchResult.found ?? 0,
      };
    } catch (err) {
      process.stderr.write(
        JSON.stringify({
          level: 'warn',
          message: `Typesense search error: ${err instanceof Error ? err.message : String(err)}`,
          timestamp: new Date().toISOString(),
        }) + '\n'
      );
      return { results: [], total: 0, search_unavailable: true };
    }
  }

  /**
   * Upsert a single document into the collection.
   */
  async upsert(doc: TypesenseDocument): Promise<void> {
    await this.client
      .collections(this.collectionName)
      .documents()
      .upsert(doc);
  }

  /**
   * Delete a single document by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.client
        .collections(this.collectionName)
        .documents(id)
        .delete();
    } catch (err: any) {
      // 404 is fine — document was already gone
      if (err?.httpStatus === 404) return;
      throw err;
    }
  }

  /**
   * Batch upsert documents into the collection.
   * Uses the import API with upsert action for idempotent writes.
   */
  async batchUpsert(docs: TypesenseDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.client
      .collections(this.collectionName)
      .documents()
      .import(docs, { action: 'upsert' });
  }

  /**
   * Delete documents matching a filter string.
   */
  async deleteByFilter(filter: string): Promise<void> {
    await this.client
      .collections(this.collectionName)
      .documents()
      .delete({ filter_by: filter });
  }

  /**
   * Ensure the collection exists, creating it if needed.
   * If it already exists, this is a no-op.
   */
  async ensureCollection(): Promise<void> {
    try {
      await this.client.collections(this.collectionName).retrieve();
    } catch (err: any) {
      if (err?.httpStatus === 404) {
        await this.client.collections().create(COLLECTION_SCHEMA);
      } else {
        throw err;
      }
    }
  }

  /**
   * Check if Typesense is reachable and healthy.
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.client.health.retrieve();
      return health.ok === true;
    } catch {
      return false;
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract a readable snippet from Typesense highlight data.
 * Prefers body highlights, falls back to title.
 */
function extractSnippet(
  highlights: Array<{ field: string; snippet?: string; snippets?: string[] }> | undefined
): string {
  if (!highlights || highlights.length === 0) return '';

  // Prefer body field
  const bodyHighlight = highlights.find((h) => h.field === 'body');
  if (bodyHighlight) {
    return bodyHighlight.snippet ?? bodyHighlight.snippets?.[0] ?? '';
  }

  // Fall back to title
  const titleHighlight = highlights.find((h) => h.field === 'title');
  if (titleHighlight) {
    return titleHighlight.snippet ?? titleHighlight.snippets?.[0] ?? '';
  }

  // Fall back to first available
  const first = highlights[0];
  return first.snippet ?? first.snippets?.[0] ?? '';
}
