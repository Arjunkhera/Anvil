// Note storage abstraction wrapping file-store and indexer
import { readNote, writeNote, generateFilePath, deleteFile, } from '../../storage/file-store.js';
import { upsertNote, deleteNote, getNote, getForwardRelationships, getReverseRelationships, } from '../../index/indexer.js';
/**
 * NoteStore wraps file-store and indexer operations into a cohesive API.
 * All write operations are atomic - updates to both filesystem and database.
 */
export class NoteStore {
    db;
    vaultPath;
    constructor(db, vaultPath) {
        this.db = db;
        this.vaultPath = vaultPath;
    }
    /**
     * Create a new note: write to filesystem and index in database
     */
    async create(note) {
        // Write to filesystem
        await writeNote(note);
        // Index in database
        upsertNote(this.db, note);
    }
    /**
     * Retrieve a note by ID from filesystem
     */
    async get(noteId) {
        // Get note metadata from database
        const result = getNote(this.db, noteId);
        if (!result) {
            return null;
        }
        // Read full note from filesystem
        const filePath = result.file_path || result.filePath;
        const readResult = await readNote(filePath);
        if ('error' in readResult) {
            return null;
        }
        return readResult.note;
    }
    /**
     * Update a note: write to filesystem and re-index
     */
    async update(note) {
        // Write to filesystem
        await writeNote(note);
        // Re-index in database
        upsertNote(this.db, note);
    }
    /**
     * Delete a note: remove from filesystem and database
     */
    async delete(noteId) {
        // Get file path from database
        const result = getNote(this.db, noteId);
        if (result) {
            // Delete from filesystem
            const filePath = result.file_path || result.filePath;
            await deleteFile(filePath);
        }
        // Delete from database (cascade deletes relationships and tags)
        deleteNote(this.db, noteId);
    }
    /**
     * Get forward and reverse relationships for a note
     */
    async getRelated(noteId) {
        const forward = getForwardRelationships(this.db, noteId) || [];
        const reverse = getReverseRelationships(this.db, noteId) || [];
        return { forward, reverse };
    }
    /**
     * Generate a file path for a new note
     */
    async generateFilePath(title, type) {
        return generateFilePath(this.vaultPath, title, type, 'flat');
    }
}
//# sourceMappingURL=note-store.js.map