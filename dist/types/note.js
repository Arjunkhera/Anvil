// Core note types — identity, metadata, relationships, content
// --- Type guards ---
export function isNote(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'noteId' in value &&
        'type' in value &&
        'title' in value &&
        'body' in value &&
        'filePath' in value);
}
export function isNoteMetadata(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'noteId' in value &&
        'type' in value &&
        'title' in value);
}
/**
 * Parse a wiki-link string into the note title it references.
 * "[[My Note]]" → "My Note"
 * "[[My Note|Display Text]]" → "My Note"
 */
export function parseWikiLink(link) {
    const match = link.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
    return match ? match[1].trim() : null;
}
/**
 * Format a note title as a wiki-link string.
 * "My Note" → "[[My Note]]"
 */
export function toWikiLink(title) {
    return `[[${title}]]`;
}
//# sourceMappingURL=note.js.map