import Database from 'better-sqlite3';
import type { Note, NoteMetadata, Relationship } from '../types/index.js';
/**
 * Upsert a note into the database within a single transaction.
 * This includes:
 * 1. Upsert into notes table
 * 2. Sync note_tags table
 * 3. Sync relationships table
 * 4. Update notes_fts virtual table
 * 5. Forward reference reconciliation
 */
export declare function upsertNote(db: Database.Database, note: Note): void;
/**
 * Delete a note and update related data.
 * 1. Set target_id = NULL in relationships where target_id = noteId (preserve forward ref)
 * 2. Delete from notes (cascade deletes tags and relationships where source_id = noteId)
 * 3. Delete from notes_fts
 */
export declare function deleteNote(db: Database.Database, noteId: string): void;
/**
 * Full rebuild within a single transaction.
 * 1. DELETE all notes (cascade deletes tags, relationships)
 * 2. DELETE from notes_fts (virtual table cleanup)
 * 3. Upsert all notes one by one
 */
export declare function fullRebuild(db: Database.Database, notes: Note[]): void;
/**
 * Get a note's metadata by ID
 */
export declare function getNote(db: Database.Database, noteId: string): NoteMetadata | null;
/**
 * Get forward relationships (relationships where this note is the source)
 */
export declare function getForwardRelationships(db: Database.Database, noteId: string): Relationship[];
/**
 * Get reverse relationships (relationships where this note is the target)
 */
export declare function getReverseRelationships(db: Database.Database, noteId: string): Relationship[];
/**
 * Get all indexed note paths and their metadata for startup catchup
 */
export declare function getAllNotePaths(db: Database.Database): Array<{
    noteId: string;
    filePath: string;
    modified: string;
}>;
//# sourceMappingURL=indexer.d.ts.map