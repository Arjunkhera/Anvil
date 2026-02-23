import Database from 'better-sqlite3';
import type { ListView, TableView, BoardView } from '../types/view.js';
import type { TypeRegistry } from '../registry/type-registry.js';
/**
 * Fetch tags for a set of note IDs.
 * Returns a Map<noteId, string[]>.
 */
export declare function getTagsForNotes(db: Database.Database, noteIds: string[]): Map<string, string[]>;
/**
 * Render raw query results as a list view.
 * Maps each row to ListItem with tags fetched in batch.
 */
export declare function renderList(db: Database.Database, rows: any[], total: number, limit: number, offset: number): ListView;
/**
 * Auto-detect columns for table view based on type or sensible defaults.
 */
export declare function autoDetectColumns(type?: string, registry?: TypeRegistry): string[];
/**
 * Render query results as a table view.
 * Builds TableRow[] with values mapped from specified columns.
 */
export declare function renderTable(db: Database.Database, rows: any[], total: number, columns: string[], limit: number, offset: number): TableView;
/**
 * Render query results as a board (kanban) view.
 * Groups rows by groupBy field and organizes into columns.
 */
export declare function renderBoard(db: Database.Database, rows: any[], groupBy: string, enumValues?: string[]): BoardView;
//# sourceMappingURL=renderer.d.ts.map