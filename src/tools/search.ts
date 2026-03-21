// Handler for anvil_search tool

import type { AnvilDb } from '../index/sqlite.js';
import type { SearchInput } from '../types/tools.js';
import type { ToolContext } from './create-note.js';
import type { SearchResponse, SearchResult } from '../types/view.js';
import type { AnvilError } from '../types/error.js';
import type { QueryFilter } from '../types/query.js';
import { makeError, ERROR_CODES } from '../types/error.js';
import { searchFts, queryNotes, combinedSearch, buildQuerySql } from '../index/fts.js';
import {
  type TypesenseSearchClient,
  type TypesenseSearchQuery,
  type TypesenseSearchResponse,
  buildFilterBy,
} from '../search/index.js';
import { toEpochMs } from '../search/typesense-indexer.js';

/**
 * Validate that search results reference existing notes in the database.
 * FTS5 returns note UUIDs directly from the DB join, so results should
 * always resolve. Any that don't are dropped as stale.
 */
function validateSearchNoteIds(
  db: AnvilDb,
  results: Array<{ noteId: string; score: number; snippet: string }>
): Array<{ noteId: string; score: number; snippet: string }> {
  if (results.length === 0) return [];

  const resolved: Array<{ noteId: string; score: number; snippet: string }> = [];

  for (const r of results) {
    if (!r.noteId) continue;

    const row = db.getOne<{ note_id: string }>(
      'SELECT note_id FROM notes WHERE note_id = ?',
      [r.noteId]
    );
    if (row) {
      resolved.push(r);
    }
  }

  return resolved;
}

/**
 * Apply structured filters to a set of pre-resolved note IDs.
 * Returns only the IDs that pass the filter.
 */
function filterNoteIds(
  db: AnvilDb,
  noteIds: string[],
  filter: QueryFilter
): string[] {
  if (noteIds.length === 0) return [];

  const { sql: baseSql, params: baseParams } = buildQuerySql(filter);
  const placeholders = noteIds.map(() => '?').join(',');
  const whereConnector = baseSql.toUpperCase().includes('WHERE') ? ' AND ' : ' WHERE ';
  const constrainedSql = baseSql + `${whereConnector}notes.note_id IN (${placeholders})`;

  const rows = db.getAll<{ note_id: string }>(
    // Wrap to select only the note_id column
    `SELECT notes.note_id FROM (${constrainedSql.trim()}) AS notes`,
    [...baseParams, ...noteIds]
  );

  return rows.map((r) => r.note_id);
}

/**
 * Fetch tags for a set of note IDs.
 * Returns a Map<noteId, string[]>.
 */
function fetchTagsForNotes(
  db: AnvilDb,
  noteIds: string[]
): Map<string, string[]> {
  if (noteIds.length === 0) {
    return new Map();
  }

  const placeholders = noteIds.map(() => '?').join(',');
  const rows = db.getAll<{ note_id: string; tag: string }>(
    `SELECT note_id, tag FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY tag`,
    noteIds
  );

  const tagsMap = new Map<string, string[]>();
  for (const row of rows) {
    if (!tagsMap.has(row.note_id)) {
      tagsMap.set(row.note_id, []);
    }
    tagsMap.get(row.note_id)!.push(row.tag);
  }

  return tagsMap;
}

/**
 * Fetch additional metadata for notes given their IDs.
 * Returns metadata keyed by noteId.
 */
function fetchNoteMetadata(
  db: AnvilDb,
  noteIds: string[]
): Map<
  string,
  {
    type: string;
    title: string;
    status?: string;
    priority?: string;
    due?: string;
    modified: string;
  }
> {
  if (noteIds.length === 0) {
    return new Map();
  }

  const placeholders = noteIds.map(() => '?').join(',');
  const rows = db.getAll<{
    note_id: string;
    type: string;
    title: string;
    status?: string | null;
    priority?: string | null;
    due?: string | null;
    modified: string;
  }>(
    `SELECT note_id, type, title, status, priority, due, modified FROM notes WHERE note_id IN (${placeholders})`,
    noteIds
  );

  const metadataMap = new Map(
    rows.map((row) => [
      row.note_id,
      {
        type: row.type,
        title: row.title,
        status: row.status || undefined,
        priority: row.priority || undefined,
        due: row.due || undefined,
        modified: row.modified,
      },
    ])
  );

  return metadataMap;
}

/**
 * Build QueryFilter from SearchInput.
 * Maps input fields to filter fields.
 */
function buildQueryFilter(input: SearchInput): QueryFilter {
  const filter: QueryFilter = {};

  if (input.query) {
    filter.query = input.query;
  }
  if (input.type) {
    filter.type = input.type;
  }
  if (input.status) {
    filter.status = input.status;
  }
  if (input.priority) {
    filter.priority = input.priority;
  }
  if (input.tags && input.tags.length > 0) {
    filter.tags = input.tags;
  }
  if (input.due) {
    filter.due = input.due;
  }
  if (input.assignee) {
    filter.assignee = input.assignee;
  }
  if (input.project) {
    filter.project = input.project;
  }
  if (input.scope) {
    filter.scope = input.scope;
  }

  return filter;
}

/**
 * Check if a QueryFilter has any non-query fields (i.e., actual filters).
 */
function hasFilters(filter: QueryFilter): boolean {
  return !!(
    filter.type ||
    filter.status ||
    filter.priority ||
    filter.tags ||
    filter.due ||
    filter.assignee ||
    filter.project ||
    filter.scope
  );
}

// ─── Typesense search helpers ───────────────────────────────────────────────

/**
 * Translate a SearchInput into a TypesenseSearchQuery.
 * Automatically adds `source:=anvil` to filter_by so only Anvil notes are returned.
 */
export function buildTypesenseQuery(input: SearchInput): TypesenseSearchQuery {
  const filters: Record<string, unknown> = { source: 'anvil' };

  if (input.type) filters.source_type = input.type;
  if (input.status) filters.status = input.status;
  if (input.priority) filters.priority = input.priority;
  if (input.tags && input.tags.length > 0) filters.tags = input.tags;
  if (input.assignee) filters.assignee_id = input.assignee;
  if (input.project) filters.project_id = input.project;

  // Scope filters
  if (input.scope?.context) filters.scope_context = input.scope.context;

  // Due date range → epoch ms range
  if (input.due) {
    const dueRange: { gte?: number; lte?: number } = {};
    if (input.due.gte) dueRange.gte = toEpochMs(input.due.gte);
    if (input.due.lte) dueRange.lte = toEpochMs(input.due.lte);
    if (dueRange.gte || dueRange.lte) filters.due_at = dueRange;
  }

  const filterBy = buildFilterBy(filters);

  // Page number is 1-based in Typesense
  const perPage = input.limit || 20;
  const page = Math.floor((input.offset || 0) / perPage) + 1;

  return {
    q: input.query || '*',
    query_by: 'title,body,tags',
    filter_by: filterBy || undefined,
    sort_by: input.query ? undefined : 'modified_at:desc',
    per_page: perPage,
    page,
    highlight_fields: 'title,body',
    snippet_threshold: 60,
  };
}

/**
 * Execute a Typesense search query, enrich results with SQLite metadata,
 * and return the standard SearchResponse format.
 *
 * Falls back to `{ search_unavailable: true }` on connection errors,
 * allowing the caller to retry via FTS5.
 */
export async function searchViaTypesense(
  client: TypesenseSearchClient,
  input: SearchInput,
  db: AnvilDb
): Promise<SearchResponse & { search_unavailable?: boolean }> {
  const query = buildTypesenseQuery(input);
  const tsResponse: TypesenseSearchResponse = await client.search(query);

  if (tsResponse.search_unavailable) {
    return { results: [], total: 0, limit: input.limit || 20, offset: input.offset || 0, search_unavailable: true };
  }

  // Map Typesense results to note IDs
  const noteIds = tsResponse.results.map((r) => r.id);

  // Enrich from SQLite for consistent metadata
  const tagsMap = fetchTagsForNotes(db, noteIds);
  const metadataMap = fetchNoteMetadata(db, noteIds);

  const results: SearchResult[] = [];
  for (const tsResult of tsResponse.results) {
    const metadata = metadataMap.get(tsResult.id);
    if (!metadata) continue; // Note was deleted from SQLite after Typesense indexed it

    results.push({
      noteId: tsResult.id,
      type: metadata.type,
      title: metadata.title,
      status: metadata.status,
      priority: metadata.priority,
      due: metadata.due,
      tags: tagsMap.get(tsResult.id) || [],
      modified: metadata.modified,
      score: tsResult.score ?? null,
      snippet: tsResult.snippet || null,
    });
  }

  return {
    results,
    total: tsResponse.total,
    limit: input.limit || 20,
    offset: input.offset || 0,
  };
}

// ─── Main handler ───────────────────────────────────────────────────────────

/**
 * Handle anvil_search request.
 * Tries Typesense first (if available), falling back to FTS5.
 * Performs FTS, filter-only, or combined search based on input.
 * Returns paginated SearchResult objects with metadata and tags.
 */
export async function handleSearch(
  input: SearchInput,
  ctx: ToolContext
): Promise<SearchResponse | AnvilError> {
  try {
    const limit = input.limit || 20;
    const offset = input.offset || 0;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return makeError(
        ERROR_CODES.VALIDATION_ERROR,
        'limit must be between 1 and 100'
      );
    }
    if (offset < 0) {
      return makeError(
        ERROR_CODES.VALIDATION_ERROR,
        'offset must be non-negative'
      );
    }

    // ── Typesense path (preferred when available) ──
    if (ctx.typesenseClient) {
      const tsResult = await searchViaTypesense(ctx.typesenseClient, input, ctx.db.raw);
      if (!tsResult.search_unavailable) {
        return {
          results: tsResult.results,
          total: tsResult.total,
          limit: tsResult.limit,
          offset: tsResult.offset,
        };
      }
      // Typesense unavailable — fall through to legacy path
    }

    // ── FTS5 fallback path ──

    // Build filter
    const filter = buildQueryFilter(input);
    const hasActiveFilters = hasFilters(filter);

    let searchResults: Array<{ noteId: string; score?: number; snippet?: string }> = [];
    let total = 0;

    // Case 1: Query + Filters → FTS search candidates filtered by structured criteria
    if (input.query && hasActiveFilters) {
      if (ctx.searchEngine) {
        try {
          // Fetch more candidates than needed to allow for filter attrition
          const rawResults = await ctx.searchEngine.query(input.query, { limit: limit * 5 });
          const resolved = validateSearchNoteIds(ctx.db.raw, rawResults);
          const filteredIds = filterNoteIds(ctx.db.raw, resolved.map((r) => r.noteId), filter);
          const filteredSet = new Set(filteredIds);
          const filtered = resolved.filter((r) => filteredSet.has(r.noteId));
          total = filtered.length;
          searchResults = filtered.slice(offset, offset + limit);
        } catch {
          // FTS engine query failed — fall back to combined search
          const combined = combinedSearch(ctx.db.raw, input.query, filter, limit, offset);
          searchResults = combined.results;
          total = combined.total;
        }
      } else {
        const combined = combinedSearch(ctx.db.raw, input.query, filter, limit, offset);
        searchResults = combined.results.map((r) => ({
          noteId: r.noteId,
          score: r.score,
          snippet: r.snippet,
        }));
        total = combined.total;
      }
    }
    // Case 2: Query only → FTS search
    else if (input.query && !hasActiveFilters) {
      if (ctx.searchEngine) {
        try {
          const rawResults = await ctx.searchEngine.query(input.query, { limit, offset });
          const resolved = validateSearchNoteIds(ctx.db.raw, rawResults);
          searchResults = resolved;
          total = resolved.length < limit ? offset + resolved.length : offset + limit;
        } catch {
          // FTS engine query failed — fall back to direct FTS
          const ftsResults = searchFts(ctx.db.raw, input.query, limit, offset);
          searchResults = ftsResults;
          total = ftsResults.length < limit
            ? offset + ftsResults.length
            : (ctx.db.raw.getOne<{ count: number }>(
                `SELECT COUNT(*) as count FROM notes_fts WHERE notes_fts MATCH ?`,
                [input.query]
              )?.count ?? 0);
        }
      } else {
        const ftsResults = searchFts(ctx.db.raw, input.query, limit, offset);
        total = ftsResults.length;

        if (ftsResults.length < limit) {
          total = offset + ftsResults.length;
        } else {
          const countRow = ctx.db.raw.getOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM notes_fts WHERE notes_fts MATCH ?`,
            [input.query]
          );
          total = countRow?.count ?? 0;
        }

        searchResults = ftsResults.map((r) => ({
          noteId: r.noteId,
          score: r.score,
          snippet: r.snippet,
        }));
      }
    }
    // Case 3: Filters only → use queryNotes
    else if (hasActiveFilters) {
      const queryResult = queryNotes(
        ctx.db.raw,
        filter,
        { field: 'modified', direction: 'desc' },
        limit,
        offset
      );

      searchResults = queryResult.rows.map((row) => ({
        noteId: row.note_id || row.noteId,
      }));
      total = queryResult.total;
    }
    // Case 4: No query and no filters → return empty
    else {
      return {
        results: [],
        total: 0,
        limit,
        offset,
      };
    }

    // Fetch tags and metadata for all results
    const noteIds = searchResults.map((r) => r.noteId);
    const tagsMap = fetchTagsForNotes(ctx.db.raw, noteIds);
    const metadataMap = fetchNoteMetadata(ctx.db.raw, noteIds);

    // Build final SearchResult array
    const results: SearchResult[] = [];
    for (const result of searchResults) {
      const metadata = metadataMap.get(result.noteId);
      if (!metadata) {
        // Shouldn't happen if data is consistent, skip
        continue;
      }

      results.push({
        noteId: result.noteId,
        type: metadata.type,
        title: metadata.title,
        status: metadata.status,
        priority: metadata.priority,
        due: metadata.due,
        tags: tagsMap.get(result.noteId) || [],
        modified: metadata.modified,
        score: result.score ?? null,
        snippet: result.snippet ?? null,
      });
    }

    return {
      results,
      total,
      limit,
      offset,
    };
  } catch (err) {
    return makeError(
      ERROR_CODES.SERVER_ERROR,
      `Search failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
