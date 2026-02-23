import type { ToolContext } from './create-note.js';
export type FieldInfo = {
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
    values?: string[];
    ref_type?: string;
    min?: number;
    max?: number;
    pattern?: string;
    description?: string;
};
export type TypeInfo = {
    typeId: string;
    name: string;
    description?: string;
    icon?: string;
    extends: string | null;
    fields: FieldInfo[];
    behaviors: {
        append_only: boolean;
    };
};
/**
 * Handle anvil_list_types request.
 * Returns all types from registry sorted alphabetically by typeId.
 * Fields are ordered with core fields first, then type-specific fields alphabetically.
 */
export declare function handleListTypes(ctx: ToolContext): {
    types: TypeInfo[];
};
//# sourceMappingURL=list-types.d.ts.map