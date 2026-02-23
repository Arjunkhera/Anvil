/**
 * Core slug transformation: convert text to URL-safe format.
 * Lowercase, replace spaces/special chars with hyphens, remove consecutive
 * hyphens, strip leading/trailing hyphens.
 */
export declare function slugify(text: string): string;
/**
 * Generate a URL-safe slug from a title.
 * Converts title to lowercase, replaces spaces and special chars with hyphens,
 * removes consecutive hyphens, strips leading/trailing hyphens.
 */
export declare function generateSlug(title: string, maxLength?: number): string;
/**
 * Generate a file path for a new note.
 * For 'flat': {slug}.md
 * For 'by-type': {type}/{slug}.md
 * Handles collisions by appending -1, -2, etc.
 */
export declare function generateFilePath(title: string, type: string, strategy: "flat" | "by-type" | undefined, existingPaths: Set<string>): string;
//# sourceMappingURL=slug.d.ts.map