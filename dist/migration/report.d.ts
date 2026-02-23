export type FileStatus = 'ok' | 'skipped' | 'error';
export type FileMigrationResult = {
    filePath: string;
    status: FileStatus;
    noteIdAdded: boolean;
    typeAssigned: string | null;
    dataviewFieldsConverted: string[];
    warnings: string[];
    error?: string;
};
export type MigrationReport = {
    totalFiles: number;
    processed: number;
    noteIdsAdded: number;
    typesAssigned: number;
    dataviewFieldsConverted: number;
    warnings: string[];
    errors: string[];
    files: FileMigrationResult[];
};
/**
 * Create an empty migration report.
 */
export declare function createEmptyReport(): MigrationReport;
/**
 * Add a file result to the report and update counters.
 */
export declare function addFileResult(report: MigrationReport, result: FileMigrationResult): void;
/**
 * Format migration report as human-readable summary.
 */
export declare function formatReportSummary(report: MigrationReport): string;
/**
 * Format migration report as full markdown.
 */
export declare function formatReportMarkdown(report: MigrationReport): string;
//# sourceMappingURL=report.d.ts.map