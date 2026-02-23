# Story: Type Registry & Validation Engine

> ID: 001 | Status: **draft** | Priority: P1-high | Created: 2026-02-23

## Description

Build the type registry system that loads type definitions from `.anvil/types/*.yaml`, resolves single inheritance chains, and provides a validation engine for note frontmatter. This is the foundational layer — every other component depends on knowing what types exist and what fields they expect.

The type registry is Anvil's equivalent of Tana's supertag system. Each type defines fields with types, constraints, defaults, and validation rules. Types support single inheritance (`extends`) with a max chain depth of 3 levels. The implicit root is `_core`, which defines fields present on every note (noteId, type, title, created, modified, tags, related, scope).

## Acceptance Criteria

- [ ] **YAML loading:** Parse all `.yaml` files in `.anvil/types/` directory. Invalid YAML files produce clear error messages with file path and parse error details. Missing directory produces a startup error.
- [ ] **Core type:** `_core.yaml` is loaded first and validated as the implicit root. All types inherit its fields (noteId, type, title, created, modified, tags, related, scope).
- [ ] **Single inheritance:** Types with `extends: <parent_type_id>` resolve their full field set by merging parent fields with child fields. Child fields override parent fields of the same name. Circular inheritance is detected and rejected with a clear error.
- [ ] **Max depth enforcement:** Inheritance chains deeper than 3 levels (_core → parent → child) produce a clear error naming the chain that exceeds the limit.
- [ ] **Field type validation:** The validator correctly handles all 10 field types: `string` (min/max length, regex pattern), `enum` (value must be in `values` list), `date` (valid ISO date), `datetime` (valid ISO datetime), `number` (min/max, integer vs float), `boolean` (true/false only), `tags` (array of strings, no duplicates), `reference` (wiki-link format, optional `ref_type` constraint), `reference_list` (array of references, no duplicates), `text` (free-form string), `url` (valid URL format).
- [ ] **Strict mode (MCP writes):** When `mode: "strict"`, invalid values are rejected with a structured error: `{ error: true, code: "VALIDATION_ERROR", field: "<name>", message: "...", allowed_values: [...] }`. The write does not proceed.
- [ ] **Warn mode (index rebuild):** When `mode: "warn"`, invalid values produce warnings (logged with file path, field name, and issue) but the note is still processed. This allows gracefully indexing legacy content.
- [ ] **Enum strictness:** Passing an invalid enum value (e.g., `status: "banana"` for a task) returns a structured error listing the allowed values. No partial matches, no fuzzy matching.
- [ ] **Tag deduplication:** Tags arrays are deduplicated automatically. `["work", "work", "urgent"]` becomes `["work", "urgent"]`.
- [ ] **Reference validation:** References to non-existent notes produce a warning but are allowed (forward references). The `ref_type` constraint is checked against the target note's type if the target exists.
- [ ] **Auto fields:** `noteId` (auto: uuid) generates a UUID v4 on create. `created` (auto: now) sets current datetime on create. `modified` (auto: now) updates on every save. `immutable: true` fields reject updates after initial creation.
- [ ] **Type-level behaviors:** `append_only: true` is parsed from type YAML and available as a queryable property on the resolved type.
- [ ] **SQLite cache:** Resolved type definitions (with inheritance applied) are stored in a `types` table (`type_id`, `name`, `schema_json`, `template_json`, `updated_at`). The cache is rebuilt when YAML files change.
- [ ] **Default types shipped:** `_core`, `note`, `task`, `project`, `story`, `person`, `service`, `meeting`, `journal` — all defined in `defaults/` directory and copied to vault on init.
- [ ] **Unit tests:** Comprehensive test coverage for inheritance resolution, every field type validator, strict vs warn mode, auto fields, edge cases (empty values, null, missing required fields, extra unknown fields).

## Technical Notes

**Key files to create:**
- `src/registry/type-registry.ts` — Loads YAML files, resolves inheritance, caches in memory and SQLite
- `src/registry/validator.ts` — Field validation engine with strict/warn modes
- `src/types/schema.ts` — TypeScript types for type definitions, field definitions, validation results
- `defaults/*.yaml` — All 9 default type template YAML files

**Design references:**
- Type system: §1 of Phase 1 design doc (templates, inheritance, field types, validation behavior)
- SQLite types table schema: §4 of Phase 1 design doc
- Core fields: `_core.yaml` definition in §1

**Implementation approach:**
- Use `js-yaml` for YAML parsing
- Use `zod` for validating the type definition YAML structure itself (meta-validation)
- The validator should be a pure function: `validate(value, fieldDef, mode) → ValidationResult`
- Inheritance resolution should produce a flat `ResolvedType` with all fields merged — consumers never need to walk the chain themselves

**Edge cases to handle:**
- Type YAML references a parent that doesn't exist → clear error
- Two types with the same `id` → clear error (duplicate type)
- Field with `required: true` but no value provided → error in strict mode, warning in warn mode
- Unknown field in frontmatter not defined by type → ignore (don't reject, allows gradual migration)

## Dependencies

- None — this is the first story in the build order

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §1, §4 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
