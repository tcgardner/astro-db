# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Copy lockfiles first for layer-cache efficiency
COPY package*.json ./
COPY dashboard/package*.json dashboard/
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
COPY dashboard ./dashboard
RUN npm run build

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM node:24-slim AS runtime
WORKDIR /app

# Install curl for healthcheck (before switching to non-root user)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled server + built dashboard
COPY --from=build /app/dist ./dist
COPY --from=build /app/dashboard/dist ./dashboard/dist

# Copy node_modules compiled for Linux (native addons already built)
COPY --from=build /app/node_modules ./node_modules

# package.json needed for ESM module resolution
COPY package.json ./

# Run as non-root
USER node

EXPOSE 3001
CMD ["node", "dist/main.js", "db", "serve"]
