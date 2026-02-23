import type { SyncPushInput, AnvilError } from '../types/index.js';
import type { ToolContext } from './create-note.js';
export type SyncPushOutput = {
    status: 'ok';
    filesCommitted: number;
    commitHash: string;
} | {
    status: 'no_changes';
} | {
    status: 'push_failed';
    message: string;
};
/**
 * Handle anvil_sync_push request.
 * Validates vault has git repo, then performs push.
 */
export declare function handleSyncPush(input: SyncPushInput, ctx: ToolContext): Promise<SyncPushOutput | AnvilError>;
//# sourceMappingURL=sync-push.d.ts.map