export type InferenceRule = {
    pathPattern: string;
    type: string;
};
export type DefaultConfig = {
    rules: InferenceRule[];
};
export declare const DEFAULT_CONFIG: DefaultConfig;
/**
 * Infer type from file path and frontmatter.
 * Returns matched type or 'note' as default.
 * If existingFrontmatter.type is set, return it unchanged.
 * Otherwise match filePath against rules (case-insensitive substring match).
 */
export declare function inferType(filePath: string, existingFrontmatter: Record<string, unknown>, config?: DefaultConfig): string;
/**
 * Infer naming prefix from title.
 * Detects common naming prefixes like [[PE Name]] → 'person', [[SV Name]] → 'service'
 * Returns the inferred type or null if no prefix matches.
 */
export declare function inferNamingPrefix(title: string, prefixMap?: Record<string, string>): string | null;
//# sourceMappingURL=type-inferrer.d.ts.map