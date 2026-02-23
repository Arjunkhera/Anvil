import Database from 'better-sqlite3';
import type { TypeRegistry } from '../registry/type-registry.js';
/**
 * Options for configuring the AnvilWatcher
 */
export type WatcherOptions = {
    vaultPath: string;
    db: Database.Database;
    registry: TypeRegistry;
    debounceMs?: number;
    ignorePatterns?: string[];
    onError?: (err: Error) => void;
};
/**
 * Chokidar-based file watcher for vault changes.
 * Handles startup catchup to index changes that occurred while offline,
 * debounces events, processes in batches, and watches type definitions.
 */
export declare class AnvilWatcher {
    private options;
    private watcher;
    private pendingEvents;
    private debounceTimer;
    private batchCompletionCallbacks;
    /**
     * Create a new AnvilWatcher instance
     */
    constructor(options: WatcherOptions);
    /**
     * Start watching the vault.
     * Runs startup catchup first to handle changes while offline,
     * then initializes the chokidar watcher for real-time updates.
     */
    start(): Promise<void>;
    /**
     * Stop watching the vault and clean up resources
     */
    stop(): Promise<void>;
    /**
     * Wait for current batch of pending events to be processed.
     * Used by git sync to wait for re-indexing before syncing.
     */
    waitForBatch(): Promise<void>;
    /**
     * Handle a file system event by collecting it in the pending events map.
     * Last event for a path wins within the debounce window.
     */
    private handleEvent;
    /**
     * Process accumulated events in a batch.
     * Deletes are handled by looking up noteId in the database,
     * adds/changes are re-read from disk and re-indexed.
     * Never crashes on a single bad file — logs error and continues.
     */
    private processBatch;
    /**
     * On startup, compare file mtimes to index and re-index changed files.
     * Handles new files, modified files, and deleted files.
     */
    private startupCatchup;
    /**
     * Watch the .anvil/types directory for type definition changes.
     * Reloads the type registry on any change.
     */
    private watchTypeDefinitions;
    /**
     * Build chokidar-compatible ignore patterns
     */
    private buildIgnorePatterns;
    /**
     * Build string array of ignore patterns for scanVault
     */
    private buildIgnorePatternsArray;
}
//# sourceMappingURL=watcher.d.ts.map