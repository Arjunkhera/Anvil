#!/bin/bash
set -e

NOTES_PATH="${ANVIL_NOTES_PATH:-/data/notes}"
QMD_COLLECTION="${ANVIL_QMD_COLLECTION:-anvil}"
REPO_URL="${ANVIL_REPO_URL:-}"
SYNC_INTERVAL="${ANVIL_SYNC_INTERVAL:-300}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

# PID of the background git sync daemon (set in Step 4 if started)
SYNC_PID=""
# PID of the Anvil MCP server process
NODE_PID=""

log() {
  echo "{\"level\":\"info\",\"message\":\"$1\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >&2
}

log_err() {
  echo "{\"level\":\"error\",\"message\":\"$1\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >&2
}

# ── Helper function for bidirectional sync ─────────────────────────────────────
push_cycle() {
  git -C "$NOTES_PATH" add -A 2>/dev/null
  if ! git -C "$NOTES_PATH" diff --cached --quiet 2>/dev/null; then
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    git -C "$NOTES_PATH" commit -m "auto: sync $TIMESTAMP" 2>/dev/null || true
    git -C "$NOTES_PATH" push 2>/dev/null || {
      log_err "Final push failed"
    }
    log "Final push cycle complete"
  else
    log "Final push cycle: no changes to commit"
  fi
}

# ── Graceful shutdown ──────────────────────────────────────────────────────────
# Trap SIGTERM and SIGINT. Kill the background sync daemon (if running), run a
# final push cycle, and clean up the node process before the shell exits.
shutdown() {
  log "Shutdown signal received — cleaning up..."
  # Stop the sync daemon
  if [ -n "$SYNC_PID" ] && kill -0 "$SYNC_PID" 2>/dev/null; then
    log "Stopping git sync daemon (PID: $SYNC_PID)..."
    kill "$SYNC_PID"
    wait "$SYNC_PID" 2>/dev/null || true
    log "Git sync daemon stopped"
  fi
  # Final push flush before exit
  if [ -d "$NOTES_PATH/.git" ] && [ -n "$GITHUB_TOKEN" ]; then
    log "Running final push cycle before shutdown..."
    push_cycle
  fi
  # Kill the node process if running
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    kill "$NODE_PID"
    wait "$NODE_PID" 2>/dev/null || true
  fi
  exit 0
}
trap shutdown SIGTERM SIGINT

# Step 1: Clone repo if ANVIL_REPO_URL is set and .git directory doesn't exist
if [ -n "$REPO_URL" ] && [ ! -d "$NOTES_PATH/.git" ]; then
  log "Cloning notes repository from $REPO_URL..."

  # Inject GitHub token into URL if provided
  if [ -n "$GITHUB_TOKEN" ]; then
    CLONE_URL=$(echo "$REPO_URL" | sed "s|https://|https://${GITHUB_TOKEN}@|")
  else
    CLONE_URL="$REPO_URL"
  fi

  git clone "$CLONE_URL" "$NOTES_PATH" || {
    log_err "Failed to clone repository"
    exit 1
  }
  log "Repository cloned successfully"
fi

# Fail-fast guard: if REPO_URL is unset and .git doesn't exist, error and exit
if [ -z "$REPO_URL" ] && [ ! -d "$NOTES_PATH/.git" ]; then
  log_err "ANVIL_REPO_URL is not set and $NOTES_PATH has no .git directory. Cannot start."
  exit 1
fi

# Step 2: Configure git for token-based auth if GITHUB_TOKEN is set
if [ -n "$GITHUB_TOKEN" ] && [ -d "$NOTES_PATH/.git" ]; then
  git -C "$NOTES_PATH" config credential.helper "store"
  echo "https://oauth2:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
fi

# Step 2.5: Set git identity for auto-commits
git -C "$NOTES_PATH" config user.email "horus@local" 2>/dev/null || true
git -C "$NOTES_PATH" config user.name "Horus Anvil Sync" 2>/dev/null || true

# Step 3: Set up QMD collection if QMD is available
if command -v qmd &>/dev/null; then
  log "Setting up QMD collection '$QMD_COLLECTION'..."

  # Ensure collection exists (idempotent)
  qmd collection add "$NOTES_PATH" --name "$QMD_COLLECTION" --mask "**/*.md" 2>/dev/null || {
    log "QMD collection already exists or setup skipped"
  }

  # Register path contexts for better search relevance
  qmd context add "$NOTES_PATH" "Anvil working memory — SDLC notes, tasks, stories, scratch journals" 2>/dev/null || true
  qmd context add "$NOTES_PATH/projects" "Software project directories with stories, specs, and documentation" 2>/dev/null || true
  qmd context add "$NOTES_PATH/scratches" "Global scratch journals — design discussions, ideas, research, decisions" 2>/dev/null || true

  # Check if initial index is needed
  INDEX_COUNT=$(qmd search "." -c "$QMD_COLLECTION" --json -n 1 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")

  if [ "$INDEX_COUNT" = "0" ]; then
    log "Building initial QMD index (this may take a while)..."
    qmd update -c "$QMD_COLLECTION" 2>&1 | while read line; do
      echo "{\"level\":\"debug\",\"message\":\"qmd: $line\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >&2
    done
    log "Initial index complete"
  else
    log "QMD index exists with $INDEX_COUNT documents, skipping rebuild"
  fi
else
  log "QMD not found — will use FTS5 search fallback"
fi

# Step 4: Start background git sync daemon with bidirectional sync (pull + commit + push)
# Only runs when a git repository exists (indicated by .git directory presence).
if [ -d "$NOTES_PATH/.git" ]; then
  log "Starting git sync daemon (interval: ${SYNC_INTERVAL}s)..."

  (
    while true; do
      sleep "$SYNC_INTERVAL"

      # Pull remote changes first
      log "Running git pull..."
      git -C "$NOTES_PATH" pull --ff-only 2>/dev/null || {
        log_err "Git pull failed (will retry next cycle)"
      }

      # Commit and push any local changes
      git -C "$NOTES_PATH" add -A 2>/dev/null
      if ! git -C "$NOTES_PATH" diff --cached --quiet 2>/dev/null; then
        TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        git -C "$NOTES_PATH" commit -m "auto: sync $TIMESTAMP" 2>/dev/null || {
          log_err "Git commit failed (will retry next cycle)"
        }
        git -C "$NOTES_PATH" push 2>/dev/null || {
          log_err "Git push failed (will retry next cycle)"
        }
        log "Sync complete: committed and pushed local changes"
      else
        log "Sync complete: no local changes to commit"
      fi

      # Re-index QMD after sync
      if command -v qmd &>/dev/null; then
        qmd update -c "$QMD_COLLECTION" 2>/dev/null || true
      fi
    done
  ) &

  SYNC_PID=$!
  log "Sync daemon started (PID: $SYNC_PID)"
fi

# Step 5: Start Anvil MCP server in HTTP mode.
# Run node as a background process and wait for it, allowing SIGTERM to be handled
# via the trap above.
log "Starting Anvil MCP server in HTTP mode on port ${ANVIL_PORT:-8100}..."

node /app/dist/index.js \
  --vault "$NOTES_PATH" \
  --http \
  --port "${ANVIL_PORT:-8100}" &

NODE_PID=$!
log "Anvil MCP server started (PID: $NODE_PID)"

# Wait for node process — this keeps the shell alive to handle SIGTERM
wait "$NODE_PID"
