import Database from 'better-sqlite3';
import type { ResolvedType } from '../types/index.js';
export declare class AnvilDatabase {
    private db;
    constructor(dbPath: string);
    /** Run migrations to bring schema up to current version */
    private initialize;
    /** Expose raw DB for use by other modules */
    get raw(): Database.Database;
    /** Cache resolved type definitions in the types table */
    upsertType(type: ResolvedType): void;
    close(): void;
}
//# sourceMappingURL=sqlite.d.ts.map