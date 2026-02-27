import type { AnvilDb } from './sqlite.js';
import type { QueryFilter, SortOrder } from '../types/index.js';
export interface SearchResult {
    noteId: string;
    score: number;
    snippet: string;
}
/**
 * Search using FTS5 with BM25 ranking
 * Returns ranked results with snippets
 */
export declare function searchFts(db: AnvilDb, query: string, limit: number, offset: number): SearchResult[];
/**
 * Query notes with filters, sorting, and pagination
 */
export declare function queryNotes(db: AnvilDb, filters: QueryFilter, orderBy: SortOrder, limit: number, offset: number): {
    rows: any[];
    total: number;
};
/**
 * Combined search: FTS + filter + recency boost
 */
export declare function combinedSearch(db: AnvilDb, query: string, filters: QueryFilter, limit: number, offset: number): {
    results: SearchResult[];
    total: number;
};
//# sourceMappingURL=fts.d.ts.map