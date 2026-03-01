import type { AnvilDb } from '../../index/sqlite.js';
import type { SearchEngine, SearchOptions, SearchResult } from './engine.js';
/**
 * FTS5-based search engine using BM25 ranking.
 * Provides fast full-text search with snippet extraction.
 */
export declare class FtsSearchEngine implements SearchEngine {
    private db;
    constructor(db: AnvilDb);
    /**
     * Search using FTS5 with BM25 ranking
     * Returns ranked results with snippets
     */
    search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Query with same semantics as search for FTS
     */
    query(query: string, opts?: SearchOptions): Promise<SearchResult[]>;
}
//# sourceMappingURL=fts-engine.d.ts.map