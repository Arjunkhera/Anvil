// Type registry: loads, validates, and resolves type definitions with inheritance
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { ERROR_CODES, makeError } from '../types/index.js';
/** Zod schema to validate the structure of a type definition YAML file */
const FieldDefinitionSchema = z.lazy(() => z.object({
    type: z.enum([
        'string',
        'enum',
        'date',
        'datetime',
        'number',
        'boolean',
        'tags',
        'reference',
        'reference_list',
        'text',
        'url',
        'object',
    ]),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
    immutable: z.boolean().optional(),
    auto: z.enum(['uuid', 'now']).optional(),
    min_length: z.number().optional(),
    max_length: z.number().optional(),
    pattern: z.string().optional(),
    values: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().optional(),
    ref_type: z.string().optional(),
    no_duplicates: z.boolean().optional(),
    fields: z.record(FieldDefinitionSchema).optional(),
    description: z.string().optional(),
}));
const TypeBehaviorsSchema = z.object({
    append_only: z.boolean().optional(),
});
const TypeDefinitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    extends: z.string().optional(),
    fields: z.record(FieldDefinitionSchema),
    behaviors: TypeBehaviorsSchema.optional(),
    template: z
        .object({
        frontmatter: z.record(z.unknown()).optional(),
        body: z.string().optional(),
    })
        .optional(),
});
/** Service for loading and managing type definitions with inheritance resolution */
export class TypeRegistry {
    types = new Map();
    definitions = new Map();
    db;
    /**
     * Initialize the registry with an optional SQLite database for caching
     */
    constructor(db) {
        this.db = db;
    }
    /**
     * Load all type definitions from a directory and resolve their inheritance chains.
     * Loads _core.yaml first (as the implicit root), then all other .yaml files.
     * Validates structure with zod, detects circular inheritance, enforces max depth.
     */
    async loadTypes(typesDir) {
        try {
            const files = await fs.readdir(typesDir);
            const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
            // Load _core.yaml first
            const coreIndex = yamlFiles.indexOf('_core.yaml');
            if (coreIndex !== -1) {
                yamlFiles.splice(coreIndex, 1);
                yamlFiles.unshift('_core.yaml');
            }
            // Parse all YAML files
            for (const file of yamlFiles) {
                const filePath = path.join(typesDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const raw = yaml.load(content);
                // Validate structure with zod
                try {
                    const definition = TypeDefinitionSchema.parse(raw);
                    // Check for duplicate type IDs
                    if (this.definitions.has(definition.id)) {
                        return makeError(ERROR_CODES.DUPLICATE_ID, `Duplicate type ID: ${definition.id}`);
                    }
                    this.definitions.set(definition.id, definition);
                }
                catch (err) {
                    if (err instanceof z.ZodError) {
                        return makeError(ERROR_CODES.SCHEMA_ERROR, `Invalid type schema in ${file}: ${err.errors[0]?.message || 'unknown error'}`);
                    }
                    throw err;
                }
            }
            // Resolve inheritance for all types
            for (const [typeId, definition] of this.definitions) {
                const resolved = this.resolveType(definition);
                if ('error' in resolved) {
                    return resolved;
                }
                this.types.set(typeId, resolved);
            }
            // Cache in SQLite if available
            if (this.db) {
                await this.cacheTypesToDb();
            }
        }
        catch (err) {
            if (err instanceof Error) {
                return makeError(ERROR_CODES.IO_ERROR, `Failed to load types from ${typesDir}: ${err.message}`);
            }
            throw err;
        }
    }
    /**
     * Get a resolved type by ID
     */
    getType(typeId) {
        return this.types.get(typeId);
    }
    /**
     * Get all resolved types
     */
    getAllTypes() {
        return Array.from(this.types.values());
    }
    /**
     * Check if a type exists
     */
    hasType(typeId) {
        return this.types.has(typeId);
    }
    /**
     * Resolve a type definition: merge fields from inheritance chain.
     * _core is implicit parent. Validates inheritance: no circular refs, max 3 levels.
     */
    resolveType(definition) {
        // Build inheritance chain (child → parent → _core)
        const chain = [definition];
        let current = definition;
        let depth = 1;
        while (current.extends) {
            depth++;
            if (depth > 3) {
                return makeError(ERROR_CODES.SCHEMA_ERROR, `Type inheritance too deep (max 3 levels): ${definition.id}`);
            }
            const parent = this.definitions.get(current.extends);
            if (!parent) {
                return makeError(ERROR_CODES.TYPE_NOT_FOUND, `Unknown parent type: ${current.extends} (parent of ${definition.id})`);
            }
            // Detect circular inheritance
            if (chain.some((t) => t.id === parent.id)) {
                return makeError(ERROR_CODES.SCHEMA_ERROR, `Circular inheritance detected in type ${definition.id}`);
            }
            chain.push(parent);
            current = parent;
        }
        // Implicit _core as root (if not already present)
        if (!chain.some((t) => t.id === '_core') && definition.id !== '_core') {
            const coreType = this.definitions.get('_core');
            if (coreType) {
                chain.push(coreType);
            }
        }
        // Merge fields from inheritance chain (reverse: root → leaf)
        const mergedFields = {};
        const ownFields = { ...definition.fields };
        for (let i = chain.length - 1; i >= 0; i--) {
            const t = chain[i];
            for (const [fieldName, fieldDef] of Object.entries(t.fields)) {
                mergedFields[fieldName] = fieldDef;
            }
        }
        return {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            icon: definition.icon,
            extends: definition.extends,
            fields: mergedFields,
            behaviors: definition.behaviors || {},
            template: definition.template,
            ownFields,
        };
    }
    /**
     * Cache resolved types to SQLite `types` table (if db available)
     */
    async cacheTypesToDb() {
        if (!this.db)
            return;
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        extends TEXT,
        fields_json TEXT NOT NULL,
        behaviors_json TEXT NOT NULL,
        template_json TEXT,
        own_fields_json TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO types
      (id, name, description, icon, extends, fields_json, behaviors_json, template_json, own_fields_json, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
        for (const resolved of this.types.values()) {
            stmt.run(resolved.id, resolved.name, resolved.description || null, resolved.icon || null, resolved.extends || null, JSON.stringify(resolved.fields), JSON.stringify(resolved.behaviors), resolved.template ? JSON.stringify(resolved.template) : null, JSON.stringify(resolved.ownFields));
        }
    }
}
//# sourceMappingURL=type-registry.js.map