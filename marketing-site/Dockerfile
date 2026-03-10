# ============================================================
# VOLLOS Marketing Site — Next.js Standalone Build
# ============================================================

# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runtime
FROM node:22-slim
WORKDIR /app
RUN adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:0 /app/public ./public
COPY --from=builder --chown=appuser:0 /app/.next/standalone ./
COPY --from=builder --chown=appuser:0 /app/.next/static ./.next/static

USER appuser
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
