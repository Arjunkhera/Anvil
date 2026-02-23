import type { SyncPullInput, AnvilError } from '../types/index.js';
import type { ToolContext } from './create-note.js';
export type SyncPullOutput = {
    status: 'ok';
    filesChanged: number;
    conflicts: [];
} | {
    status: 'conflict';
    conflicts: Array<{
        filePath: string;
        type: 'merge_conflict';
    }>;
} | {
    status: 'no_changes';
};
/**
 * Handle anvil_sync_pull request.
 * Validates vault has git repo, then performs pull with optional conflict detection.
 */
export declare function handleSyncPull(input: SyncPullInput, ctx: ToolContext): Promise<SyncPullOutput | AnvilError>;
//# sourceMappingURL=sync-pull.d.ts.map