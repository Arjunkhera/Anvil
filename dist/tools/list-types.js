// Handler for anvil_list_types tool
const CORE_FIELD_ORDER = ['noteId', 'type', 'title', 'created', 'modified', 'tags', 'related', 'scope'];
/**
 * Handle anvil_list_types request.
 * Returns all types from registry sorted alphabetically by typeId.
 * Fields are ordered with core fields first, then type-specific fields alphabetically.
 */
export function handleListTypes(ctx) {
    // Get all types from registry
    const allTypes = ctx.registry.getAllTypes();
    // Sort types alphabetically by typeId
    const sortedTypes = allTypes.sort((a, b) => a.id.localeCompare(b.id));
    // Build TypeInfo for each type
    const types = sortedTypes.map((type) => {
        // Build field list with core fields first, then type-specific fields alphabetically
        const fieldInfos = buildFieldInfos(type);
        return {
            typeId: type.id,
            name: type.name,
            description: type.description,
            icon: type.icon,
            extends: type.extends || null,
            fields: fieldInfos,
            behaviors: {
                append_only: type.behaviors.append_only ?? false,
            },
        };
    });
    return { types };
}
/**
 * Build the field info list with core fields first, then type-specific fields.
 */
function buildFieldInfos(type) {
    const fieldInfos = [];
    const addedFields = new Set();
    // Add core fields first in their defined order
    for (const fieldName of CORE_FIELD_ORDER) {
        if (fieldName in type.fields) {
            const fieldDef = type.fields[fieldName];
            fieldInfos.push({
                name: fieldName,
                type: fieldDef.type,
                required: fieldDef.required ?? false,
                default: fieldDef.default,
                values: fieldDef.values,
                ref_type: fieldDef.ref_type,
                min: fieldDef.min,
                max: fieldDef.max,
                pattern: fieldDef.pattern,
                description: fieldDef.description,
            });
            addedFields.add(fieldName);
        }
    }
    // Add remaining fields alphabetically
    const remainingFields = Object.keys(type.fields)
        .filter((name) => !addedFields.has(name))
        .sort();
    for (const fieldName of remainingFields) {
        const fieldDef = type.fields[fieldName];
        fieldInfos.push({
            name: fieldName,
            type: fieldDef.type,
            required: fieldDef.required ?? false,
            default: fieldDef.default,
            values: fieldDef.values,
            ref_type: fieldDef.ref_type,
            min: fieldDef.min,
            max: fieldDef.max,
            pattern: fieldDef.pattern,
            description: fieldDef.description,
        });
    }
    return fieldInfos;
}
//# sourceMappingURL=list-types.js.map