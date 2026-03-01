import type { AnvilDb } from '../../index/sqlite.js';
import type { Note } from '../../types/note.js';
/**
 * NoteStore wraps file-store and indexer operations into a cohesive API.
 * All write operations are atomic - updates to both filesystem and database.
 */
export declare class NoteStore {
    private db;
    private vaultPath;
    constructor(db: AnvilDb, vaultPath: string);
    /**
     * Create a new note: write to filesystem and index in database
     */
    create(note: Note): Promise<void>;
    /**
     * Retrieve a note by ID from filesystem
     */
    get(noteId: string): Promise<Note | null>;
    /**
     * Update a note: write to filesystem and re-index
     */
    update(note: Note): Promise<void>;
    /**
     * Delete a note: remove from filesystem and database
     */
    delete(noteId: string): Promise<void>;
    /**
     * Get forward and reverse relationships for a note
     */
    getRelated(noteId: string): Promise<{
        forward: any[];
        reverse: any[];
    }>;
    /**
     * Generate a file path for a new note
     */
    generateFilePath(title: string, type: string): Promise<string>;
}
//# sourceMappingURL=note-store.d.ts.map