/**
 * Parse a wiki-link text, stripping brackets and alias.
 * "[[Note Title]]" → "Note Title"
 * "[[Note Title|Display Text]]" → "Note Title"
 */
export declare function parseWikiLinkText(text: string): string;
/**
 * Extract all wiki-links from markdown body.
 * Finds all [[wiki-link]] patterns.
 * Handles: [[Note Title]] → "Note Title"
 *          [[Note Title|Display Text]] → "Note Title"
 * Skips links inside fenced code blocks (``` ... ```)
 * Skips links inside inline code (`...`)
 * Returns deduplicated list of link texts (without brackets).
 */
export declare function extractWikiLinks(body: string): string[];
//# sourceMappingURL=wiki-links.d.ts.map