// View data renderer — transforms raw query results into list/table/board JSON
/**
 * Fetch tags for a set of note IDs.
 * Returns a Map<noteId, string[]>.
 */
export function getTagsForNotes(db, noteIds) {
    if (noteIds.length === 0) {
        return new Map();
    }
    const placeholders = noteIds.map(() => '?').join(',');
    const rows = db.getAll(`SELECT note_id, tag FROM note_tags WHERE note_id IN (${placeholders}) ORDER BY tag`, noteIds);
    const tagsMap = new Map();
    for (const row of rows) {
        if (!tagsMap.has(row.note_id)) {
            tagsMap.set(row.note_id, []);
        }
        tagsMap.get(row.note_id).push(row.tag);
    }
    return tagsMap;
}
/**
 * Render raw query results as a list view.
 * Maps each row to ListItem with tags fetched in batch.
 */
export function renderList(db, rows, total, limit, offset) {
    // Extract note IDs and fetch tags in batch
    const noteIds = rows.map((row) => row.note_id || row.noteId);
    const tagsMap = getTagsForNotes(db, noteIds);
    // Map rows to ListItems
    const items = rows.map((row) => ({
        noteId: row.note_id || row.noteId,
        type: row.type,
        title: row.title,
        status: row.status || undefined,
        priority: row.priority || undefined,
        due: row.due || undefined,
        tags: tagsMap.get(row.note_id || row.noteId) || [],
        modified: row.modified,
        score: row.score || undefined,
        snippet: row.snippet || undefined,
    }));
    return {
        view: 'list',
        items,
        total,
        limit,
        offset,
    };
}
/**
 * Auto-detect columns for table view based on type or sensible defaults.
 */
export function autoDetectColumns(type, registry) {
    // If type is specified, return relevant columns for that type
    if (type && registry) {
        const resolvedType = registry.getType(type);
        if (resolvedType) {
            // Include title first, then status/priority/due if they exist in the type
            const columns = ['title'];
            const fieldNames = Object.keys(resolvedType.fields);
            if (fieldNames.includes('status')) {
                columns.push('status');
            }
            if (fieldNames.includes('priority')) {
                columns.push('priority');
            }
            if (fieldNames.includes('due')) {
                columns.push('due');
            }
            columns.push('tags');
            return columns;
        }
    }
    // Default columns for any type
    return ['title', 'type', 'status', 'priority', 'due', 'tags', 'modified'];
}
/**
 * Format a value for table display.
 * Handles dates, booleans, and arrays.
 */
function formatTableValue(value) {
    if (value === null || value === undefined) {
        return null;
    }
    // Handle dates: if it looks like an ISO date string, keep as is
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value;
    }
    // Handle booleans
    if (typeof value === 'boolean') {
        return value;
    }
    // Handle arrays and objects
    if (Array.isArray(value)) {
        return value;
    }
    // Everything else as is
    return value;
}
/**
 * Render query results as a table view.
 * Builds TableRow[] with values mapped from specified columns.
 */
export function renderTable(db, rows, total, columns, limit, offset) {
    // Extract note IDs and fetch tags in batch
    const noteIds = rows.map((row) => row.note_id || row.noteId);
    const tagsMap = getTagsForNotes(db, noteIds);
    // Map rows to TableRows
    const tableRows = rows.map((row) => {
        const values = {
            noteId: row.note_id || row.noteId,
        };
        for (const column of columns) {
            // Special handling for tags column
            if (column === 'tags') {
                values[column] = tagsMap.get(row.note_id || row.noteId) || [];
            }
            // Map database column names (snake_case) to display names
            else if (column === 'noteId') {
                values[column] = row.note_id || row.noteId;
            }
            else if (column === 'type') {
                values[column] = row.type;
            }
            else if (column === 'title') {
                values[column] = row.title;
            }
            else if (column === 'status') {
                values[column] = formatTableValue(row.status);
            }
            else if (column === 'priority') {
                values[column] = formatTableValue(row.priority);
            }
            else if (column === 'due') {
                values[column] = formatTableValue(row.due);
            }
            else if (column === 'modified') {
                values[column] = formatTableValue(row.modified);
            }
            else if (column === 'created') {
                values[column] = formatTableValue(row.created);
            }
            else if (column === 'effort') {
                values[column] = formatTableValue(row.effort);
            }
            else {
                // Generic column: try to find in row by exact name or variations
                values[column] =
                    formatTableValue(row[column]) ||
                        formatTableValue(row[column.replace(/_/g, '')] || row[column.replace(/-/g, '_')]);
            }
        }
        return { noteId: row.note_id || row.noteId, values };
    });
    return {
        view: 'table',
        columns,
        rows: tableRows,
        total,
        limit,
        offset,
    };
}
/**
 * Render query results as a board (kanban) view.
 * Groups rows by groupBy field and organizes into columns.
 */
export function renderBoard(db, rows, groupBy, enumValues) {
    // Extract note IDs and fetch tags in batch
    const noteIds = rows.map((row) => row.note_id || row.noteId);
    const tagsMap = getTagsForNotes(db, noteIds);
    // Group rows by the groupBy field
    const columnMap = new Map();
    for (const row of rows) {
        const fieldName = groupBy.toLowerCase();
        const groupValue = row[fieldName] || row[groupBy] || '(No Value)';
        const groupKey = String(groupValue);
        if (!columnMap.has(groupKey)) {
            columnMap.set(groupKey, []);
        }
        columnMap.get(groupKey).push(row);
    }
    // Build columns in the correct order
    let columnIds;
    if (enumValues && enumValues.length > 0) {
        // If enum values provided, use them in order (even if empty)
        columnIds = enumValues;
    }
    else {
        // Otherwise, sort column IDs alphabetically
        columnIds = Array.from(columnMap.keys()).sort();
    }
    const columns = columnIds.map((columnId) => {
        const columnRows = columnMap.get(columnId) || [];
        // Map rows to BoardItems
        const items = columnRows.map((row) => ({
            noteId: row.note_id || row.noteId,
            title: row.title,
            type: row.type,
            status: row.status || undefined,
            priority: row.priority || undefined,
            due: row.due || undefined,
            tags: tagsMap.get(row.note_id || row.noteId) || [],
            modified: row.modified,
        }));
        return {
            id: columnId,
            title: capitalizeFirst(columnId),
            items,
        };
    });
    return {
        view: 'board',
        groupBy,
        columns,
    };
}
/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
//# sourceMappingURL=renderer.js.map