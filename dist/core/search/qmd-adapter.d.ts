import type { SearchEngine, SearchOptions, SearchResult } from './engine.js';
export interface QMDAdapterOptions {
    collectionName?: string;
    qmdPath?: string;
    maxBuffer?: number;
}
export declare class QMDAdapter implements SearchEngine {
    private collectionName;
    private qmdPath;
    private maxBuffer;
    constructor(opts?: QMDAdapterOptions);
    /**
     * Full semantic query — expansion + reranking via `qmd query`
     */
    query(text: string, opts?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Fast BM25 keyword search via `qmd search`
     */
    search(text: string, opts?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Vector similarity search via `qmd vsearch`
     */
    similar(text: string, opts?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Re-index the collection via `qmd update`
     * Note: This triggers a re-index. Call after writes.
     */
    reindex(): Promise<void>;
    /**
     * Ensure collection exists, pointing at the notes directory.
     * Idempotent — if collection exists, this is a no-op.
     * Uses `qmd collection add` — safe to call multiple times.
     */
    ensureCollection(notesPath: string): Promise<void>;
    /**
     * Register path-based QMD contexts for better search relevance.
     * Called once during setup.
     */
    registerContexts(notesPath: string): Promise<void>;
    /**
     * Check if QMD is available in PATH.
     */
    static isAvailable(qmdPath?: string): Promise<boolean>;
    private exec;
    /**
     * Normalize QMD output to our SearchResult format.
     * QMD returns: { docid, score, file, snippet, collection } or array thereof
     */
    private normalizeResults;
    private pathToNoteId;
}
//# sourceMappingURL=qmd-adapter.d.ts.map