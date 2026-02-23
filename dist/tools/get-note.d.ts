import type { GetNoteInput, NoteWithRelationships, AnvilError } from '../types/index.js';
import type { ToolContext } from './create-note.js';
/**
 * Handle anvil_get_note request.
 * Retrieves a note by ID with full content, relationships, and metadata.
 */
export declare function handleGetNote(input: GetNoteInput, ctx: ToolContext): Promise<NoteWithRelationships | AnvilError>;
//# sourceMappingURL=get-note.d.ts.map