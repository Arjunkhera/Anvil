import type { UpdateNoteInput, UpdateNoteOutput, AnvilError } from '../types/index.js';
import type { ToolContext } from './create-note.js';
/**
 * Handle anvil_update_note request.
 * Updates a note with PATCH semantics, respecting append_only and immutable constraints.
 */
export declare function handleUpdateNote(input: UpdateNoteInput, ctx: ToolContext): Promise<UpdateNoteOutput | AnvilError>;
//# sourceMappingURL=update-note.d.ts.map