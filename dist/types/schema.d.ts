export type FieldType = 'string' | 'enum' | 'date' | 'datetime' | 'number' | 'boolean' | 'tags' | 'reference' | 'reference_list' | 'text' | 'url' | 'object';
/** Definition for a single field in a type template */
export type FieldDefinition = {
    type: FieldType;
    required?: boolean;
    default?: unknown;
    immutable?: boolean;
    /** Auto-population strategy */
    auto?: 'uuid' | 'now';
    min_length?: number;
    max_length?: number;
    pattern?: string;
    values?: string[];
    min?: number;
    max?: number;
    integer?: boolean;
    ref_type?: string;
    no_duplicates?: boolean;
    fields?: Record<string, FieldDefinition>;
    description?: string;
};
/** Behavioral flags declared at the type level */
export type TypeBehaviors = {
    /** If true, note body can only be appended to, never replaced */
    append_only?: boolean;
};
/** Default frontmatter + body template for new notes */
export type TypeTemplate = {
    frontmatter?: Record<string, unknown>;
    body?: string;
};
/** Raw type definition as parsed from a .anvil/types/*.yaml file */
export type TypeDefinition = {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    /** Parent type to inherit fields from */
    extends?: string;
    fields: Record<string, FieldDefinition>;
    behaviors?: TypeBehaviors;
    template?: TypeTemplate;
};
/** Metadata tracking the source of a type definition */
export type TypeSource = {
    directory: string;
    file: string;
    plugin?: string;
};
/**
 * A resolved type has its full field set already merged with parent fields.
 * Consumers never need to walk the inheritance chain.
 */
export type ResolvedType = {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    extends?: string;
    /** All fields merged from the inheritance chain (core → parent → child) */
    fields: Record<string, FieldDefinition>;
    behaviors: TypeBehaviors;
    template?: TypeTemplate;
    /** Only fields defined directly on this type (not inherited) */
    ownFields: Record<string, FieldDefinition>;
    /** Source tracking: which directory and file this type came from */
    source: TypeSource;
};
export type ValidationMode = 'strict' | 'warn';
export type FieldValidationError = {
    field: string;
    message: string;
    allowed_values?: string[];
};
/** Result of validating a note's frontmatter against its type schema */
export type ValidationResult = {
    valid: boolean;
    errors: FieldValidationError[];
    warnings: FieldValidationError[];
};
//# sourceMappingURL=schema.d.ts.map