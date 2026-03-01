// View query and rendering engine
import { queryNotes } from '../../index/fts.js';
import { renderList, renderTable, renderBoard, autoDetectColumns, } from '../../views/renderer.js';
/**
 * ViewEngine orchestrates querying and rendering notes for views.
 * Handles filters, sorting, pagination, and multiple output formats.
 */
export class ViewEngine {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Query notes using filters and sorting
     */
    query(filter, orderBy, limit, offset) {
        return queryNotes(this.db, filter, orderBy, limit, offset);
    }
    /**
     * Render query results as a list (markdown with metadata)
     */
    renderList(rows, total, limit, offset) {
        return renderList(this.db, rows, total, limit, offset);
    }
    /**
     * Render query results as a table with specific columns
     */
    renderTable(rows, total, columns, limit, offset) {
        return renderTable(this.db, rows, total, columns, limit, offset);
    }
    /**
     * Render query results as a board (kanban-style grouped view)
     */
    renderBoard(rows, groupBy, enumValues) {
        return renderBoard(this.db, rows, groupBy, enumValues);
    }
    /**
     * Automatically detect relevant columns for a note type
     */
    autoDetectColumns(type, registry) {
        return autoDetectColumns(type, registry);
    }
}
//# sourceMappingURL=query-engine.js.map