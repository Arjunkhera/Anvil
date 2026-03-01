FROM node:22-bookworm-slim

# System dependencies for QMD (needs cmake for node-llama-cpp builds)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    cmake \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install QMD globally from npm (if available) or from source
# Try npm first (faster), fall back to source build
RUN npm install -g qmd 2>/dev/null || \
    (git clone https://github.com/tobi/qmd.git /opt/qmd \
    && cd /opt/qmd \
    && npm install \
    && npm run build \
    && ln -s /opt/qmd/dist/cli.js /usr/local/bin/qmd) || \
    echo "QMD installation skipped - will use FTS5 fallback"

# Create non-root user
RUN useradd -ms /bin/bash anvil

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built application
COPY dist/ ./dist/
COPY defaults/ ./defaults/

# Entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Data directories
RUN mkdir -p /data/notes && chown -R anvil:anvil /app /data

USER anvil

EXPOSE 8100

# Environment configuration with defaults
ENV ANVIL_TRANSPORT=http
ENV ANVIL_PORT=8100
ENV ANVIL_HOST=0.0.0.0
ENV ANVIL_NOTES_PATH=/data/notes
ENV ANVIL_QMD_COLLECTION=anvil
ENV ANVIL_SYNC_INTERVAL=300
ENV ANVIL_DEBOUNCE_SECONDS=5

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD curl -f http://localhost:8100/health || exit 1

CMD ["./entrypoint.sh"]
