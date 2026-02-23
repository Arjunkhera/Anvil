// Structured error types used across all MCP tools and internal services
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    TYPE_NOT_FOUND: 'TYPE_NOT_FOUND',
    DUPLICATE_ID: 'DUPLICATE_ID',
    CONFLICT: 'CONFLICT',
    SYNC_ERROR: 'SYNC_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    NO_GIT_REPO: 'NO_GIT_REPO',
    NO_REMOTE: 'NO_REMOTE',
    IMMUTABLE_FIELD: 'IMMUTABLE_FIELD',
    APPEND_ONLY: 'APPEND_ONLY',
    SCHEMA_ERROR: 'SCHEMA_ERROR',
    IO_ERROR: 'IO_ERROR',
};
/** Helper to construct an AnvilError */
export function makeError(code, message, extra) {
    return { error: true, code, message, ...extra };
}
/** Type guard for AnvilError */
export function isAnvilError(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'error' in value &&
        value['error'] === true);
}
//# sourceMappingURL=error.js.map