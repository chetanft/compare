# Multi-stage build for Railway deployment
FROM node:20-slim AS builder

# Set environment to skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV DEBIAN_FRONTEND=noninteractive

# Install only essential build dependencies (no Chromium)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install root dependencies (skip Chromium)
RUN npm ci --include=dev

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm ci --include=dev

# Copy source files
WORKDIR /app
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:20-slim AS production

ENV NODE_ENV=production
ENV PORT=3847
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

# Expose port
EXPOSE 3847

# Start server
CMD ["npm", "start"]
