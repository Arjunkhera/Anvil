import type { ToolContext } from './create-note.js';
import type { AnvilError } from '../types/error.js';
export type RelatedEntry = {
    noteId: string | null;
    title: string;
    type?: string;
    resolved: boolean;
};
export type RelatedResponse = {
    noteId: string;
    title: string;
    type: string;
    forward: Record<string, RelatedEntry[]>;
    reverse: Record<string, RelatedEntry[]>;
};
/**
 * Handle anvil_get_related request.
 * Returns a note with its forward and reverse relationships grouped by type.
 */
export declare function handleGetRelated(input: {
    noteId: string;
}, ctx: ToolContext): RelatedResponse | AnvilError;
//# sourceMappingURL=get-related.d.ts.map