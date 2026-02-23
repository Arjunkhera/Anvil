// Parse and convert Obsidian dataview inline fields
/**
 * Extract dataview inline fields from markdown body.
 * Regex: /^([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.+)$/gm
 * Returns array of fields found.
 */
export function extractDataviewFields(body) {
    const fields = [];
    const regex = /^([a-zA-Z_][a-zA-Z0-9_]*)::\s*(.+)$/gm;
    const lines = body.split('\n');
    let lineIndex = 0;
    for (const line of lines) {
        // Reset regex lastIndex for this line
        regex.lastIndex = 0;
        const match = regex.exec(line);
        if (match) {
            fields.push({
                field: match[1],
                value: match[2],
                lineIndex,
            });
        }
        lineIndex++;
    }
    return fields;
}
/**
 * Convert dataview inline fields.
 * Remove the inline field lines from body.
 * Return cleaned body and dict of field name → value.
 */
export function convertDataviewFields(body, fields) {
    const convertedFields = {};
    const linesToRemove = new Set();
    // Build converted fields dict and mark lines for removal
    for (const field of fields) {
        convertedFields[field.field] = field.value;
        linesToRemove.add(field.lineIndex);
    }
    // Rebuild body, skipping lines that are dataview fields
    const lines = body.split('\n');
    const newLines = lines.filter((_, index) => !linesToRemove.has(index));
    const newBody = newLines.join('\n');
    return { newBody, convertedFields };
}
//# sourceMappingURL=dataview-converter.js.map