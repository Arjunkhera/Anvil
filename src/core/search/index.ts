// Search engine factory and exports

export { FtsSearchEngine } from './fts-engine.js';
export type { SearchEngine, SearchResult, SearchOptions } from './engine.js';

/**
 * Create the best available search engine.
 *
 * Priority:
 *   1. Typesense (handled at the application layer in src/index.ts)
 *   2. FTS5 (SQLite full-text search) — lightweight emergency fallback
 */
import { FtsSearchEngine } from './fts-engine.js';
import type { AnvilDb } from '../storage/sqlite.js';
import type { SearchEngine } from './engine.js';

export async function createSearchEngine(
  db: AnvilDb
): Promise<{ engine: SearchEngine; mode: 'fts' }> {
  process.stderr.write(JSON.stringify({ level: 'info', message: 'Using FTS5 search engine (fallback)', timestamp: new Date().toISOString() }) + '\n');
  return { engine: new FtsSearchEngine(db), mode: 'fts' };
}
