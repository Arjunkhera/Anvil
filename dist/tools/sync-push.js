// Handler for anvil_sync_push tool
import { makeError, ERROR_CODES, isAnvilError } from '../types/index.js';
import { isGitRepo, syncPush } from '../sync/git-sync.js';
/**
 * Handle anvil_sync_push request.
 * Validates vault has git repo, then performs push.
 */
export async function handleSyncPush(input, ctx) {
    try {
        // 1. Validate vault has git repo
        if (!(await isGitRepo(ctx.vaultPath))) {
            return makeError(ERROR_CODES.NO_GIT_REPO, 'Vault is not a Git repository. Initialize git with "git init".');
        }
        // 2. Call syncPush with context
        const result = await syncPush(ctx.vaultPath, input.message);
        // 3. Return result or error
        if (isAnvilError(result)) {
            return result;
        }
        return result;
    }
    catch (err) {
        return makeError(ERROR_CODES.SYNC_ERROR, `Unexpected error during push: ${err instanceof Error ? err.message : String(err)}`);
    }
}
//# sourceMappingURL=sync-push.js.map