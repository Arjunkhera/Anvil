import type { AnvilDb } from '../index/sqlite.js';
import { type InferenceRule } from './type-inferrer.js';
import { type MigrationReport } from './report.js';
export type MigrationConfig = {
    vaultPath: string;
    dryRun: boolean;
    batchSize?: number;
    typeRules?: InferenceRule[];
    prefixMap?: Record<string, string>;
};
/**
 * Main migration function.
 * Scans vault for .md files and applies migrations:
 * 1. Read frontmatter
 * 2. If already has noteId, skip (idempotent)
 * 3. Assign noteId if missing
 * 4. Infer type if missing
 * 5. Extract and convert dataview fields
 * 6. Merge converted fields into frontmatter
 * 7. If NOT dry-run: backup and write updated file
 * 8. Trigger fullRebuild if db provided and NOT dry-run
 * 9. Return report
 */
export declare function migrate(config: MigrationConfig, db?: AnvilDb): Promise<MigrationReport>;
//# sourceMappingURL=migrator.d.ts.map