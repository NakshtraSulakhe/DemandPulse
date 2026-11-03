# ========================================================
# DemandPulse Next.js Multi-Stage Production Dockerfile
# Native MySQL Driver (mysql2/promise) - Zero Prisma Engine
# Optimized for Docker Desktop / Windows & Linux servers
# ========================================================

# Stage 1: Dependencies installation
FROM node:20-slim AS deps
WORKDIR /app

# Copy package descriptors
COPY package.json package-lock.json* ./

# Configure npm with robust retry parameters to prevent ETIMEDOUT on Docker NAT
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 8

# Install dependencies using npm cache mount to speed up retries and rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Stage 2: Application Builder
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js build-time flags
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile production Next.js assets
RUN npm run build

# Stage 3: Production Runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl / wget for container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates && rm -rf /var/lib/apt/lists/*

# Create unprivileged application user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copy essential runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Set appropriate permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Launch Next.js production server on 0.0.0.0:3000
CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
