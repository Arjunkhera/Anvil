#!/bin/bash
set -e

NOTES_PATH="${ANVIL_NOTES_PATH:-/data/notes}"
QMD_COLLECTION="${ANVIL_QMD_COLLECTION:-anvil}"
REPO_URL="${ANVIL_REPO_URL:-}"
SYNC_INTERVAL="${ANVIL_SYNC_INTERVAL:-300}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

log() {
  echo "{\"level\":\"info\",\"message\":\"$1\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >&2
}

log_err() {
  echo "{\"level\":\"error\",\"message\":\"$1\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" >&2
}

# Step 1: Clone repo if ANVIL_REPO_URL is set and notes dir is empty
if [ -n "$REPO_URL" ] && [ -z "$(ls -A "$NOTES_PATH" 2>/dev/null)" ]; then
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

# Step 2: Configure git for token-based auth if GITHUB_TOKEN is set
if [ -n "$GITHUB_TOKEN" ] && [ -d "$NOTES_PATH/.git" ]; then
  git -C "$NOTES_PATH" config credential.helper "store"
  echo "https://oauth2:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
fi

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

# Step 4: Start background git pull sync daemon
if [ -d "$NOTES_PATH/.git" ] && [ -n "$GITHUB_TOKEN" ]; then
  log "Starting git sync daemon (interval: ${SYNC_INTERVAL}s)..."
  
  while true; do
    sleep "$SYNC_INTERVAL"
    log "Running git pull..."
    git -C "$NOTES_PATH" pull --ff-only 2>/dev/null || {
      log_err "Git pull failed (will retry next cycle)"
    }
    # Trigger QMD re-index after pull
    if command -v qmd &>/dev/null; then
      qmd update -c "$QMD_COLLECTION" 2>/dev/null || true
    fi
  done &
  
  SYNC_PID=$!
  log "Sync daemon started (PID: $SYNC_PID)"
fi

# Step 5: Start Anvil MCP server in HTTP mode
log "Starting Anvil MCP server in HTTP mode on port ${ANVIL_PORT:-8100}..."

exec node /app/dist/index.js \
  --vault "$NOTES_PATH" \
  --http \
  --port "${ANVIL_PORT:-8100}"
