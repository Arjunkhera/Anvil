import Database from 'better-sqlite3';
import { ResolvedType } from '../types/index.js';
import { AnvilError } from '../types/index.js';
/** Service for loading and managing type definitions with inheritance resolution */
export declare class TypeRegistry {
    private types;
    private definitions;
    private db?;
    /**
     * Initialize the registry with an optional SQLite database for caching
     */
    constructor(db?: Database.Database);
    /**
     * Load all type definitions from a directory and resolve their inheritance chains.
     * Loads _core.yaml first (as the implicit root), then all other .yaml files.
     * Validates structure with zod, detects circular inheritance, enforces max depth.
     */
    loadTypes(typesDir: string): Promise<void | AnvilError>;
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
     * Cache resolved types to SQLite `types` table (if db available)
     */
    private cacheTypesToDb;
}
//# sourceMappingURL=type-registry.d.ts.map