// Search engine factory and exports
export { QMDAdapter } from './qmd-adapter.js';
export { FtsSearchEngine } from './fts-engine.js';
/**
 * Create the best available search engine.
 * Tries QMD first (semantic search); falls back to FTS if not available.
 */
import { QMDAdapter } from './qmd-adapter.js';
import { FtsSearchEngine } from './fts-engine.js';
export async function createSearchEngine(db, opts) {
    const qmdPath = opts?.qmdPath ?? process.env.QMD_PATH ?? 'qmd';
    const isQmdAvailable = await QMDAdapter.isAvailable(qmdPath);
    if (isQmdAvailable) {
        const adapter = new QMDAdapter({
            collectionName: opts?.qmdCollection ?? process.env.ANVIL_QMD_COLLECTION ?? 'anvil',
            qmdPath,
        });
        process.stderr.write(JSON.stringify({ level: 'info', message: 'Using QMD search engine', timestamp: new Date().toISOString() }) + '\n');
        return { engine: adapter, mode: 'qmd' };
    }
    else {
        process.stderr.write(JSON.stringify({ level: 'warn', message: 'QMD not available, falling back to FTS5 search', timestamp: new Date().toISOString() }) + '\n');
        return { engine: new FtsSearchEngine(db), mode: 'fts' };
    }
}
//# sourceMappingURL=index.js.map