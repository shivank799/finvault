# ─────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install only production dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production && cp -R node_modules /tmp/prod_node_modules

# Install all deps for build
RUN npm ci

# ─────────────────────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run lint + tests in CI
RUN npm run lint --if-present
RUN npm run test:ci --if-present

# ─────────────────────────────────────────────────────────────
# Stage 3: Production
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Copy production node_modules
COPY --from=deps /tmp/prod_node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

USER nodeuser

EXPOSE 5000

# Graceful shutdown support
CMD ["node", "--max-old-space-size=512", "src/server.js"]
