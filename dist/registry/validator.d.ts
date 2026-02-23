import { ResolvedType, ValidationMode, ValidationResult } from '../types/index.js';
/**
 * Validate a note's frontmatter against its type schema.
 * Returns validation result with errors and warnings.
 * In strict mode, validation fails on first error.
 * In warn mode, collects all errors as warnings and continues.
 */
export declare function validateNote(frontmatter: Record<string, unknown>, type: ResolvedType, mode?: ValidationMode): ValidationResult;
//# sourceMappingURL=validator.d.ts.map