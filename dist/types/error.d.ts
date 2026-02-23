export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly TYPE_NOT_FOUND: "TYPE_NOT_FOUND";
    readonly DUPLICATE_ID: "DUPLICATE_ID";
    readonly CONFLICT: "CONFLICT";
    readonly SYNC_ERROR: "SYNC_ERROR";
    readonly SERVER_ERROR: "SERVER_ERROR";
    readonly NO_GIT_REPO: "NO_GIT_REPO";
    readonly NO_REMOTE: "NO_REMOTE";
    readonly IMMUTABLE_FIELD: "IMMUTABLE_FIELD";
    readonly APPEND_ONLY: "APPEND_ONLY";
    readonly SCHEMA_ERROR: "SCHEMA_ERROR";
    readonly IO_ERROR: "IO_ERROR";
};
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type FieldError = {
    field: string;
    message: string;
    allowed_values?: string[];
};
/**
 * Structured error format returned by all MCP tools and service methods.
 * Never throw unhandled errors — always return this shape.
 */
export type AnvilError = {
    error: true;
    code: ErrorCode;
    message: string;
    field?: string;
    allowed_values?: string[];
    fields?: FieldError[];
};
/** Helper to construct an AnvilError */
export declare function makeError(code: ErrorCode, message: string, extra?: Partial<Omit<AnvilError, 'error' | 'code' | 'message'>>): AnvilError;
/** Type guard for AnvilError */
export declare function isAnvilError(value: unknown): value is AnvilError;
//# sourceMappingURL=error.d.ts.map