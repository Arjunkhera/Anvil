// Handler for anvil_get_related tool
import { makeError, ERROR_CODES } from '../types/error.js';
import { getNote, getForwardRelationships, getReverseRelationships } from '../index/indexer.js';
/**
 * Handle anvil_get_related request.
 * Returns a note with its forward and reverse relationships grouped by type.
 */
export function handleGetRelated(input, ctx) {
    const db = ctx.db.raw;
    // Get note metadata
    const noteMetadata = getNote(db, input.noteId);
    if (!noteMetadata) {
        return makeError(ERROR_CODES.NOT_FOUND, `Note not found: ${input.noteId}`);
    }
    // Get forward and reverse relationships
    const forwardRels = getForwardRelationships(db, input.noteId);
    const reverseRels = getReverseRelationships(db, input.noteId);
    // Collect all target noteIds to look up
    const noteIdsToLookup = new Set();
    for (const rel of forwardRels) {
        if (rel.targetId) {
            noteIdsToLookup.add(rel.targetId);
        }
    }
    for (const rel of reverseRels) {
        if (rel.sourceId) {
            noteIdsToLookup.add(rel.sourceId);
        }
    }
    // Look up note info for all related notes
    const noteInfo = new Map();
    if (noteIdsToLookup.size > 0) {
        const placeholders = Array(noteIdsToLookup.size).fill('?').join(',');
        const stmt = db.prepare(`
      SELECT note_id, title, type FROM notes WHERE note_id IN (${placeholders})
    `);
        const rows = stmt.all(...Array.from(noteIdsToLookup));
        for (const row of rows) {
            noteInfo.set(row.note_id, { title: row.title, type: row.type });
        }
    }
    // Group forward relationships by relationType
    const forward = {};
    for (const rel of forwardRels) {
        if (!forward[rel.relationType]) {
            forward[rel.relationType] = [];
        }
        const entry = {
            noteId: rel.targetId,
            title: rel.targetTitle,
            resolved: rel.resolved,
        };
        // Add type if resolved
        if (rel.targetId && noteInfo.has(rel.targetId)) {
            const info = noteInfo.get(rel.targetId);
            entry.type = info.type;
            entry.title = info.title;
        }
        forward[rel.relationType].push(entry);
    }
    // Group reverse relationships by relationType
    const reverse = {};
    for (const rel of reverseRels) {
        if (!reverse[rel.relationType]) {
            reverse[rel.relationType] = [];
        }
        const entry = {
            noteId: rel.sourceId,
            title: rel.sourceId && noteInfo.has(rel.sourceId)
                ? noteInfo.get(rel.sourceId).title
                : rel.sourceId || '',
            resolved: rel.resolved,
        };
        // Add type if we have it
        if (rel.sourceId && noteInfo.has(rel.sourceId)) {
            const info = noteInfo.get(rel.sourceId);
            entry.type = info.type;
        }
        reverse[rel.relationType].push(entry);
    }
    return {
        noteId: input.noteId,
        title: noteMetadata.title,
        type: noteMetadata.type,
        forward,
        reverse,
    };
}
//# sourceMappingURL=get-related.js.map