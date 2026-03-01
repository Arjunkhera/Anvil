export { QMDAdapter } from './qmd-adapter.js';
export { FtsSearchEngine } from './fts-engine.js';
export type { SearchEngine, SearchResult, SearchOptions } from './engine.js';
import type { AnvilDb } from '../storage/sqlite.js';
import type { SearchEngine } from './engine.js';
export declare function createSearchEngine(db: AnvilDb, opts?: {
    qmdCollection?: string;
    qmdPath?: string;
}): Promise<{
    engine: SearchEngine;
    mode: 'qmd' | 'fts';
}>;
//# sourceMappingURL=index.d.ts.map