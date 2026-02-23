/** Canonical field ordering for frontmatter output */
export declare const CORE_FIELD_ORDER: string[];
/**
 * Parse frontmatter from file content.
 * Strips BOM on read. Returns empty data if no frontmatter.
 */
export declare function parseFrontmatter(fileContent: string): {
    data: Record<string, unknown>;
    content: string;
    isEmpty: boolean;
};
/**
 * Serialize frontmatter and body back to file content.
 * Consistent field ordering: core fields first (in CORE_FIELD_ORDER),
 * then remaining fields alphabetically.
 * Round-trip fidelity is critical.
 */
export declare function serializeFrontmatter(data: Record<string, unknown>, body: string): string;
//# sourceMappingURL=frontmatter.d.ts.map