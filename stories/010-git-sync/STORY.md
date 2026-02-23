# Story: Git Sync

> ID: 010 | Status: **draft** | Priority: P2-medium | Created: 2026-02-23

## Description

Implement two MCP tools for Git synchronization: `anvil_sync_pull` and `anvil_sync_push`. These allow agents to manually trigger sync operations on the vault's Git repo. Phase 1 is manual-only — auto-sync on interval is deferred to Phase 3.

The vault is its own Git repo. Anvil doesn't manage the Git setup (user initializes the repo and configures remotes) — Anvil just provides tools to trigger pull/push operations and handles the re-indexing aftermath.

## Acceptance Criteria

- [ ] **anvil_sync_pull:** Accepts no required inputs (optional `remote`, default "origin"; optional `branch`, default current branch). Workflow: `git fetch` → `git merge` (fast-forward preferred) → detect conflicts → if no conflicts, trigger file watcher to re-index changed files → return `{ status: "ok", filesChanged: <count>, conflicts: [] }`. If conflicts exist, return `{ status: "conflict", conflicts: [{ filePath, type: "merge_conflict" }] }` without aborting — let the user resolve.
- [ ] **anvil_sync_push:** Accepts `message` (required, commit message). Workflow: `git add` all changed `.md` files and `.anvil/types/*.yaml` (but NOT `.anvil/.local/`) → `git commit -m <message>` → `git push` → return `{ status: "ok", filesCommitted: <count>, commitHash: "..." }`. If nothing to commit, return `{ status: "no_changes" }`. If push fails (e.g., remote ahead), return `{ status: "push_failed", message: "..." }` and suggest pulling first.
- [ ] **Selective staging:** Only stage files in the vault that are user content: `*.md` files and `.anvil/types/*.yaml`. Never stage `.anvil/.local/` (derived artifacts), `.git/`, or other non-vault files. The `.gitignore` in the vault should already exclude `.anvil/.local/` but the tool enforces this independently.
- [ ] **Conflict detection:** After a merge, check for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in affected files. Report conflicted file paths to the caller. Do not attempt automatic resolution.
- [ ] **Post-pull re-indexing:** After a successful pull (no conflicts), the changed files are detected by the file watcher (story 009) and re-indexed automatically. The pull tool waits for re-indexing to complete before returning, so the caller knows the index is current.
- [ ] **No Git repo:** If the vault is not a Git repo (no `.git/` directory), both tools return a clear error: `{ error: true, code: "NO_GIT_REPO", message: "Vault is not a Git repository. Run 'git init' in the vault directory to enable sync." }`.
- [ ] **No remote:** If `git push` fails because no remote is configured, return a clear error suggesting `git remote add origin <url>`.
- [ ] **Error handling:** Git operation failures (network errors, auth failures, merge conflicts) are caught and returned as structured errors. Never crash the MCP server on a sync failure.
- [ ] **Unit tests:** Pull with fast-forward, pull with conflicts, push with changes, push with no changes, push when remote is ahead, no git repo error, no remote error. Integration test: create note → push → clone to second location → verify note exists.

## Technical Notes

**Key files to create:**
- `src/sync/git-sync.ts` — Git operations wrapper using `simple-git`
- `src/tools/sync-pull.ts` — anvil_sync_pull tool handler (if tools are split per file) or included in git-sync
- `src/tools/sync-push.ts` — anvil_sync_push tool handler

**Design references:**
- Git sync: §10 of Phase 1 design doc

**Implementation notes:**
- Use `simple-git` npm package — lightweight, well-maintained Node.js wrapper around Git CLI.
- For `sync_push`, use `git add` with explicit file patterns rather than `git add -A` to avoid accidentally staging secrets or large binaries.
- Fast-forward merge is preferred. If fast-forward is not possible (divergent branches), fall back to regular merge. Rebase is not used — it rewrites history and can cause issues with multiple clients.
- The post-pull re-indexing should leverage the existing file watcher mechanism. After `git merge`, the watcher detects changed files and processes them. But we need to wait for the batch to complete before returning from the tool call — hook into the watcher's batch completion callback.
- Consider: should push auto-commit? The design says yes (stage + commit + push in one tool call). This is simpler for agents than separate commit and push tools.

## Dependencies

- **005** — MCP server setup (tool registration)
- **009** — File watcher (post-pull re-indexing)

## History

| Date | From | To | Note |
|------|------|----|------|
| 2026-02-23 | — | draft | Story created from Phase 1 design §10 |

---
*Status transitions are logged in the History table above and detailed in scratch.md alongside.*
