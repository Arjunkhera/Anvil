import type { AnvilWatcher } from '../storage/watcher.js';
import { type AnvilError } from '../types/error.js';
/**
 * Result type for git pull operations
 */
export type SyncPullResult = {
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
 * Result type for git push operations
 */
export type SyncPushResult = {
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
 * Check if a directory is a git repository by checking for .git directory
 */
export declare function isGitRepo(vaultPath: string): Promise<boolean>;
/**
 * Perform a git pull operation (fetch + merge) with conflict detection
 * Optionally waits for watcher batch completion if no conflicts
 */
export declare function syncPull(vaultPath: string, remote?: string, branch?: string, watcher?: AnvilWatcher): Promise<SyncPullResult | AnvilError>;
/**
 * Perform a git push operation (add + commit + push)
 * Only stages .md files and .anvil/types/*.yaml files
 * Never stages .anvil/.local/ directory
 */
export declare function syncPush(vaultPath: string, message: string): Promise<SyncPushResult | AnvilError>;
//# sourceMappingURL=git-sync.d.ts.map