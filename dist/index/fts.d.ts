import Database from 'better-sqlite3';
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
export declare function searchFts(db: Database.Database, query: string, limit: number, offset: number): SearchResult[];
/**
 * Query notes with filters, sorting, and pagination
 */
export declare function queryNotes(db: Database.Database, filters: QueryFilter, orderBy: SortOrder, limit: number, offset: number): {
    rows: any[];
    total: number;
};
/**
 * Combined search: FTS + filter + recency boost
 */
export declare function combinedSearch(db: Database.Database, query: string, filters: QueryFilter, limit: number, offset: number): {
    results: SearchResult[];
    total: number;
};
//# sourceMappingURL=fts.d.ts.map