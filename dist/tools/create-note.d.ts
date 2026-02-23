import type { CreateNoteInput, CreateNoteOutput, AnvilError } from '../types/index.js';
import type { TypeRegistry } from '../registry/type-registry.js';
import type { AnvilDatabase } from '../index/sqlite.js';
import type { AnvilWatcher } from '../storage/watcher.js';
export type ToolContext = {
    vaultPath: string;
    registry: TypeRegistry;
    db: AnvilDatabase;
    watcher?: AnvilWatcher;
};
/**
 * Handle anvil_create_note request.
 * Creates a new note with auto-generated ID, applies type template,
 * validates against schema, writes to filesystem, and indexes.
 */
export declare function handleCreateNote(input: CreateNoteInput, ctx: ToolContext): Promise<CreateNoteOutput | AnvilError>;
//# sourceMappingURL=create-note.d.ts.map