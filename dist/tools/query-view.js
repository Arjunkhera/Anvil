// Handler for anvil_query_view tool
import { queryNotes } from '../index/fts.js';
import { renderList, renderTable, renderBoard, autoDetectColumns, } from '../views/renderer.js';
import { makeError, ERROR_CODES } from '../types/error.js';
/**
 * Build QueryFilter from view request filters.
 * Maps input filter fields to QueryFilter fields.
 */
function buildQueryFilter(filters) {
    if (!filters) {
        return {};
    }
    const filter = {};
    if (filters.query && typeof filters.query === 'string') {
        filter.query = filters.query;
    }
    if (filters.type && typeof filters.type === 'string') {
        filter.type = filters.type;
    }
    if (filters.status) {
        if (typeof filters.status === 'string') {
            filter.status = filters.status;
        }
        else if (typeof filters.status === 'object' &&
            filters.status !== null &&
            'not' in filters.status) {
            filter.status = filters.status;
        }
    }
    if (filters.priority && typeof filters.priority === 'string') {
        filter.priority = filters.priority;
    }
    if (filters.tags && Array.isArray(filters.tags)) {
        filter.tags = filters.tags.filter((t) => typeof t === 'string');
    }
    if (filters.due &&
        typeof filters.due === 'object' &&
        filters.due !== null) {
        filter.due = filters.due;
    }
    if (filters.created &&
        typeof filters.created === 'object' &&
        filters.created !== null) {
        filter.created = filters.created;
    }
    if (filters.modified &&
        typeof filters.modified === 'object' &&
        filters.modified !== null) {
        filter.modified = filters.modified;
    }
    if (filters.assignee && typeof filters.assignee === 'string') {
        filter.assignee = filters.assignee;
    }
    if (filters.project && typeof filters.project === 'string') {
        filter.project = filters.project;
    }
    if (filters.scope &&
        typeof filters.scope === 'object' &&
        filters.scope !== null) {
        filter.scope = filters.scope;
    }
    if (filters.archived !== undefined && typeof filters.archived === 'boolean') {
        filter.archived = filters.archived;
    }
    return filter;
}
/**
 * Validate that a field exists in the database/query results.
 * This is a basic check — can be enhanced with schema awareness.
 */
function isValidOrderByField(field) {
    const validFields = [
        'note_id',
        'noteId',
        'type',
        'title',
        'status',
        'priority',
        'due',
        'modified',
        'created',
        'effort',
    ];
    return validFields.includes(field);
}
/**
 * Handle anvil_query_view request.
 * Returns data in list, table, or board view format.
 */
export async function handleQueryView(input, ctx) {
    try {
        // Validate pagination parameters
        const limit = input.limit || 50;
        const offset = input.offset || 0;
        if (limit < 1 || limit > 100) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, 'limit must be between 1 and 100');
        }
        if (offset < 0) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, 'offset must be non-negative');
        }
        // Validate board view requires groupBy
        if (input.view === 'board' && !input.groupBy) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, 'board view requires groupBy field');
        }
        // Build filter
        const filter = buildQueryFilter(input.filters);
        // Set default orderBy
        const orderBy = input.orderBy || {
            field: 'modified',
            direction: 'desc',
        };
        // Validate orderBy field
        if (!isValidOrderByField(orderBy.field)) {
            return makeError(ERROR_CODES.VALIDATION_ERROR, `Unknown orderBy field: ${orderBy.field}`);
        }
        // Query notes
        const queryResult = queryNotes(ctx.db.raw, filter, orderBy, input.view === 'board' ? 500 : limit, input.view === 'board' ? 0 : offset);
        // Render based on view type
        if (input.view === 'list') {
            return renderList(ctx.db.raw, queryResult.rows, queryResult.total, limit, offset);
        }
        else if (input.view === 'table') {
            // Auto-detect columns if not specified
            const columns = input.columns ||
                autoDetectColumns(input.filters?.type, ctx.registry);
            return renderTable(ctx.db.raw, queryResult.rows, queryResult.total, columns, limit, offset);
        }
        else if (input.view === 'board') {
            // For board view, get enum values from type if available
            let enumValues;
            if (input.filters?.type && input.groupBy) {
                const typeObj = ctx.registry.getType(input.filters.type);
                if (typeObj) {
                    const fieldDef = typeObj.fields[input.groupBy];
                    if (fieldDef && fieldDef.type === 'enum' && fieldDef.values) {
                        enumValues = fieldDef.values;
                    }
                }
            }
            return renderBoard(ctx.db.raw, queryResult.rows, input.groupBy, enumValues);
        }
        return makeError(ERROR_CODES.VALIDATION_ERROR, `Unknown view type: ${input.view}`);
    }
    catch (err) {
        return makeError(ERROR_CODES.SERVER_ERROR, `Query view failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
//# sourceMappingURL=query-view.js.map