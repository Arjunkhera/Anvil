import type { ResolvedType } from '../types/index.js';
declare const Database: typeof import("node-sqlite3-wasm").Database;
type SqliteDatabase = InstanceType<typeof Database>;
/**
 * Thin wrapper around node-sqlite3-wasm providing a consistent query interface.
 * Replaces better-sqlite3 to eliminate native binary dependencies.
 * node-sqlite3-wasm is a WASM SQLite build with FTS5, synchronous API, and file persistence.
 */
export declare class AnvilDb {
    private sqlDb;
    constructor(sqlDb: SqliteDatabase);
    /** Execute a write statement (INSERT, UPDATE, DELETE, PRAGMA) */
    run(sql: string, params?: any[]): void;
    /** Execute a SELECT and return the first row, or null */
    getOne<T = any>(sql: string, params?: any[]): T | null;
    /** Execute a SELECT and return all rows */
    getAll<T = any>(sql: string, params?: any[]): T[];
    /** Execute one or more statements with no parameters (migrations, DDL) */
    exec(sql: string): void;
    /** Execute fn inside a BEGIN/COMMIT transaction; rolls back on error */
    transaction<T>(fn: () => T): T;
    /** No-op: node-sqlite3-wasm persists to disk automatically */
    save(): void;
    close(): void;
}
export declare class AnvilDatabase {
    private _db;
    private constructor();
    /** Synchronous factory */
    static create(dbPath: string): AnvilDatabase;
    /** Run migrations to bring schema up to current version */
    private initialize;
    /** Expose raw AnvilDb for use by indexer/fts modules */
    get raw(): AnvilDb;
    /** Cache resolved type definitions in the types table */
    upsertType(type: ResolvedType): void;
    close(): void;
}
export {};
//# sourceMappingURL=sqlite.d.ts.map