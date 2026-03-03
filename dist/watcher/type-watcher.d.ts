/**
 * Options for creating a TypeWatcher
 */
export type TypeWatcherOptions = {
    vaultPath: string;
    initialTypeDirs: string[];
    onReload: (dirs: string[]) => Promise<void>;
    debounceMs?: number;
};
/**
 * TypeWatcher interface returned from createTypeWatcher
 */
export type TypeWatcher = {
    close: () => Promise<void>;
};
/**
 * Create a TypeWatcher that monitors type definition directories for changes.
 * Watches all directories in initialTypeDirs for .yaml file changes.
 * Also watches {vaultPath}/.anvil/plugins/ for new subdirectory creation.
 * When a new plugin directory appears with a types/ subdir, adds it to the watch list and triggers a reload.
 * Debounces type reloads (default 500ms) to handle bulk file writes.
 *
 * Returns a { close() } handle for cleanup.
 */
export declare function createTypeWatcher(opts: TypeWatcherOptions): TypeWatcher;
//# sourceMappingURL=type-watcher.d.ts.map