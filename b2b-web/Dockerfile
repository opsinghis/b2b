# B2B Web - Production Dockerfile
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

FROM base AS builder

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all packages
COPY apps ./apps
COPY packages ./packages

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build all apps
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Production image for Admin
FROM base AS admin

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

USER nextjs

EXPOSE 3002

CMD ["node", "apps/admin/server.js"]

# Production image for Portal
FROM base AS portal

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3003

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=builder /app/apps/portal/public ./apps/portal/public

USER nextjs

EXPOSE 3003

CMD ["node", "apps/portal/server.js"]
