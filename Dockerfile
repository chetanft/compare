# Multi-stage build for Railway deployment
FROM node:20-slim AS builder

# Set environment to skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV DEBIAN_FRONTEND=noninteractive

# Install only essential build dependencies (no Chromium)
# Include xz-utils for lzma-native native module compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    xz-utils \
    liblzma-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies immediately (before copying large source files)
# This runs right after copying package files to avoid timeout
# Using explicit echo to verify execution and prevent caching issues
# Skip optional dependencies and ignore scripts for problematic native modules
RUN echo "Installing root dependencies..." && \
    npm ci --include=dev --ignore-scripts && \
    echo "Rebuilding native modules (excluding problematic ones)..." && \
    npm rebuild --ignore-scripts || true && \
    echo "Installing frontend dependencies..." && \
    cd frontend && \
    npm ci --include=dev && \
    cd .. && \
    echo "Dependencies installed successfully"

# Copy only frontend source files needed for build (minimal copy)
COPY frontend/src ./frontend/src
COPY frontend/index.html ./frontend/index.html
COPY frontend/vite.config.ts ./frontend/vite.config.ts
COPY frontend/tsconfig.json ./frontend/tsconfig.json
COPY frontend/tsconfig.node.json ./frontend/tsconfig.node.json
COPY frontend/tailwind.config.js ./frontend/tailwind.config.js
COPY frontend/postcss.config.js ./frontend/postcss.config.js
COPY frontend/components.json ./frontend/components.json
# Create empty public directory if it doesn't exist (Vite handles this gracefully)
RUN mkdir -p ./frontend/public

# Build frontend (now that we have source files)
RUN echo "Building frontend..." && \
    cd frontend && \
    npm run build && \
    cd .. && \
    echo "Frontend build completed successfully"

# Copy server source files (only what's needed for production)
COPY server.js ./
COPY src ./src
COPY scripts ./scripts
COPY config.example.json ./config.json

# Production stage - Railway will use this as the final stage
FROM node:20-slim AS production

ENV NODE_ENV=production
# PORT is set by Railway automatically via environment variable
# Default PORT=3847 is set in server.js, Railway will override it
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install runtime dependencies (Chromium dependencies for Puppeteer if needed at runtime)
# Note: Chromium itself will be installed via Puppeteer if required, but we skip it during build
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxss1 \
    libgtk-3-0 \
    libxshmfence1 \
    libglu1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy scripts directory before npm ci (needed for postinstall hook)
COPY scripts ./scripts

# Install production dependencies only (Puppeteer will be installed but Chromium download is skipped)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy server files
COPY server.js ./
COPY src ./src
COPY scripts ./scripts
COPY config.example.json ./config.json

# Set production environment
ENV NODE_ENV=production

# Expose port (Railway will override PORT env var, but we expose default)
EXPOSE 3847

# Start server - Railway requires this CMD to know the build is complete
CMD ["npm", "start"]
