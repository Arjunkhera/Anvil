import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const CURRENT_SCHEMA_VERSION = 1;
export class AnvilDatabase {
    db;
    constructor(dbPath) {
        // Ensure parent directory exists
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.initialize();
    }
    /** Run migrations to bring schema up to current version */
    initialize() {
        // Run migration 001 (creates all tables)
        let migrationPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations', '001_initial.sql');
        // Fallback to source directory if not found in dist
        if (!fs.existsSync(migrationPath)) {
            migrationPath = path.join(process.cwd(), 'src/index/migrations/001_initial.sql');
        }
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        this.db.exec(sql);
    }
    /** Expose raw DB for use by other modules */
    get raw() {
        return this.db;
    }
    /** Cache resolved type definitions in the types table */
    upsertType(type) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO types (type_id, name, schema_json, template_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(type.id, type.name, JSON.stringify({ fields: type.fields, behaviors: type.behaviors }), type.template ? JSON.stringify(type.template) : null, new Date().toISOString());
    }
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=sqlite.js.map