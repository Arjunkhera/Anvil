import type { AnvilDb } from '../index/sqlite.js';
import { ResolvedType } from '../types/index.js';
import { AnvilError } from '../types/index.js';
/** Service for loading and managing type definitions with inheritance resolution */
export declare class TypeRegistry {
    private types;
    private definitions;
    private definitionSources;
    private db?;
    /**
     * Initialize the registry with an optional SQLite database for caching
     */
    constructor(db?: AnvilDb);
    /**
     * Load all type definitions from multiple directories and resolve their inheritance chains.
     * Accepts either a single string (for backward compat) or an array of directory paths.
     * First directory has highest precedence. Skips missing directories with debug-level logging.
     */
    loadTypes(typesDirsInput: string | string[]): Promise<void | AnvilError>;
    /**
     * Load type definitions from a single directory.
     * Returns error only for IO errors (not just missing directories).
     * Precedence rule: if a type ID is already loaded, skip it and log a warning.
     */
    private loadTypesFromDir;
    /**
     * Get a resolved type by ID
     */
    getType(typeId: string): ResolvedType | undefined;
    /**
     * Get all resolved types
     */
    getAllTypes(): ResolvedType[];
    /**
     * Check if a type exists
     */
    hasType(typeId: string): boolean;
    /**
     * Resolve a type definition: merge fields from inheritance chain.
     * _core is implicit parent. Validates inheritance: no circular refs, max 3 levels.
     */
    private resolveType;
    /**
     * Extract plugin name from a directory path.
     * If the path matches /.anvil/plugins/{name}/types, returns {name}.
     * Otherwise returns undefined.
     */
    private extractPluginName;
    /**
     * Get all types from a specific source directory or plugin name.
     * dirOrPlugin can be either an absolute directory path or a plugin name.
     */
    getTypesBySource(dirOrPlugin: string): ResolvedType[];
    /**
     * Convenience method: get all types contributed by a specific plugin.
     * pluginName should be the name under .anvil/plugins/{name}/types/
     */
    getTypesByPlugin(pluginName: string): ResolvedType[];
    /**
     * Reload all type definitions from the given directories.
     * Clears the current state and performs a fresh load.
     * On failure, the previous state is preserved.
     * Returns undefined on success, or an AnvilError on failure.
     */
    reload(dirs: string[]): Promise<void | AnvilError>;
    /**
     * Cache resolved types to SQLite `types` table (if db available)
     */
    private cacheTypesToDb;
}
//# sourceMappingURL=type-registry.d.ts.map