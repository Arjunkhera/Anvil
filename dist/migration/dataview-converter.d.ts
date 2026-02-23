export type DataviewField = {
    field: string;
    value: string;
    lineIndex: number;
};
/**
 * Extract dataview inline fields from markdown body.
 * Regex: /^([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.+)$/gm
 * Returns array of fields found.
 */
export declare function extractDataviewFields(body: string): DataviewField[];
/**
 * Convert dataview inline fields.
 * Remove the inline field lines from body.
 * Return cleaned body and dict of field name → value.
 */
export declare function convertDataviewFields(body: string, fields: DataviewField[]): {
    newBody: string;
    convertedFields: Record<string, string>;
};
//# sourceMappingURL=dataview-converter.d.ts.map