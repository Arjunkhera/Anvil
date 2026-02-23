/** How a note reference was established */
export type RelationType = string;
/** A directional link between notes, stored in the relationships table */
export type Relationship = {
    sourceId: string;
    /** NULL when target note doesn't exist yet (forward reference) */
    targetId: string | null;
    /** The original wiki-link text used to identify the target */
    targetTitle: string;
    relationType: RelationType;
    resolved: boolean;
};
/** Optional context/team/service scoping on any note */
export type Scope = {
    context?: 'personal' | 'work';
    team?: string;
    service?: string;
};
/**
 * All frontmatter fields of a note.
 * Core fields are always present; type-specific fields live in `fields`.
 */
export type NoteMetadata = {
    noteId: string;
    type: string;
    title: string;
    created: string;
    modified: string;
    tags: string[];
    related: string[];
    scope?: Scope;
    status?: string;
    priority?: string;
    due?: string;
    effort?: number;
    fields: Record<string, unknown>;
};
/** Full note including body text and filesystem path */
export type Note = NoteMetadata & {
    body: string;
    filePath: string;
};
/** Note enriched with bidirectional relationship data */
export type NoteWithRelationships = Note & {
    relationships: {
        /** Relationships where this note is the source */
        forward: Relationship[];
        /** Relationships where this note is the target */
        reverse: Relationship[];
    };
};
/** Lightweight summary used in list/search results */
export type NoteSummary = {
    noteId: string;
    type: string;
    title: string;
    status?: string;
    priority?: string;
    due?: string;
    tags: string[];
    modified: string;
    filePath: string;
};
export declare function isNote(value: unknown): value is Note;
export declare function isNoteMetadata(value: unknown): value is NoteMetadata;
/**
 * Parse a wiki-link string into the note title it references.
 * "[[My Note]]" → "My Note"
 * "[[My Note|Display Text]]" → "My Note"
 */
export declare function parseWikiLink(link: string): string | null;
/**
 * Format a note title as a wiki-link string.
 * "My Note" → "[[My Note]]"
 */
export declare function toWikiLink(title: string): string;
//# sourceMappingURL=note.d.ts.map