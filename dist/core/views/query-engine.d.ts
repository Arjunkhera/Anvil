import type { AnvilDb } from '../../index/sqlite.js';
import type { QueryFilter, SortOrder } from '../../types/query.js';
import type { ListView, TableView, BoardView } from '../../types/view.js';
/**
 * ViewEngine orchestrates querying and rendering notes for views.
 * Handles filters, sorting, pagination, and multiple output formats.
 */
export declare class ViewEngine {
    private db;
    constructor(db: AnvilDb);
    /**
     * Query notes using filters and sorting
     */
    query(filter: QueryFilter, orderBy: SortOrder, limit: number, offset: number): {
        rows: any[];
        total: number;
    };
    /**
     * Render query results as a list (markdown with metadata)
     */
    renderList(rows: any[], total: number, limit: number, offset: number): ListView;
    /**
     * Render query results as a table with specific columns
     */
    renderTable(rows: any[], total: number, columns: string[], limit: number, offset: number): TableView;
    /**
     * Render query results as a board (kanban-style grouped view)
     */
    renderBoard(rows: any[], groupBy: string, enumValues?: string[]): BoardView;
    /**
     * Automatically detect relevant columns for a note type
     */
    autoDetectColumns(type?: string, registry?: any): string[];
}
//# sourceMappingURL=query-engine.d.ts.map