// Handler for anvil_search tool
import { makeError, ERROR_CODES } from '../types/error.js';
import { searchFts, queryNotes, combinedSearch } from '../index/fts.js';
/**
 * Fetch tags for a set of note IDs.
 * Returns a Map<noteId, string[]>.
 */
function fetchTagsForNotes(db, noteIds) {
    if (noteIds.length === 0) {
        return new Map();
    }
    const placeholders = noteIds.map(() => '?').join(',');
    const rows = db.getAll(`SELECT note_id, tag FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY tag`, noteIds);
    const tagsMap = new Map();
    for (const row of rows) {
        if (!tagsMap.has(row.note_id)) {
            tagsMap.set(row.note_id, []);
        }
        tagsMap.get(row.note_id).push(row.tag);
    }
    return tagsMap;
}
/**
 * Fetch additional metadata for notes given their IDs.
 * Returns metadata keyed by noteId.
 */
function fetchNoteMetadata(db, noteIds) {
    if (noteIds.length === 0) {
        return new Map();
    }
    const placeholders = noteIds.map(() => '?').join(',');
    const rows = db.getAll(`SELECT note_id, type, title, status, priority, due, modified FROM notes WHERE note_id IN (${placeholders})`, noteIds);
    const metadataMap = new Map(rows.map((row) => [
        row.note_id,
        {
            type: row.type,
            title: row.title,
            status: row.status || undefined,
            priority: row.priority || undefined,
            due: row.due || undefined,
            modified: row.modified,
        },
    ]));
    return metadataMap;
}
/**
 * Build QueryFilter from SearchInput.
 * Maps input fields to filter fields.
 */
function buildQueryFilter(input) {
    const filter = {};
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
function hasFilters(filter) {
    return !!(filter.type ||
        filter.status ||
        filter.priority ||
        filter.tags ||
        filter.due ||
        filter.assignee ||
        filter.project ||
        filter.scope);
}
/**
 * Handle anvil_search request.
 * Performs FTS, filter-only, or combined search based on input.
 * Returns paginated SearchResult objects with metadata and tags.
 */
export async function handleSearch(input, ctx) {
    try {
        const limit = input.limit || 20;
        const offset = input.offset || 0;
        // Validate pagination parameters
        if (limit < 1 || limit > 100) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, 'limit must be between 1 and 100');
        }
        if (offset < 0) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, 'offset must be non-negative');
        }
        // Build filter
        const filter = buildQueryFilter(input);
        const hasActiveFilters = hasFilters(filter);
        let searchResults = [];
        let total = 0;
        // Case 1: Query + Filters → use combinedSearch
        if (input.query && hasActiveFilters) {
            const combined = combinedSearch(ctx.db.raw, input.query, filter, limit, offset);
            searchResults = combined.results.map((r) => ({
                noteId: r.noteId,
                score: r.score,
                snippet: r.snippet,
            }));
            total = combined.total;
        }
        // Case 2: Query only → use searchFts, then fetch metadata
        else if (input.query && !hasActiveFilters) {
            const ftsResults = searchFts(ctx.db.raw, input.query, limit, offset);
            total = ftsResults.length;
            // FTS doesn't return a total count, so we approximate:
            // If we get fewer results than limit, we've hit the end
            // Otherwise, we estimate there might be more (could query count separately)
            if (ftsResults.length < limit) {
                total = offset + ftsResults.length;
            }
            else {
                // Try to count total FTS matches by running a count query
                const countRow = ctx.db.raw.getOne(`SELECT COUNT(*) as count FROM notes_fts WHERE notes_fts MATCH ?`, [input.query]);
                total = countRow?.count ?? 0;
            }
            searchResults = ftsResults.map((r) => ({
                noteId: r.noteId,
                score: r.score,
                snippet: r.snippet,
            }));
        }
        // Case 3: Filters only → use queryNotes
        else if (hasActiveFilters) {
            const queryResult = queryNotes(ctx.db.raw, filter, { field: 'modified', direction: 'desc' }, limit, offset);
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
        const results = [];
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
    }
    catch (err) {
        return makeError(ERROR_CODES.SERVER_ERROR, `Search failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
//# sourceMappingURL=search.js.map