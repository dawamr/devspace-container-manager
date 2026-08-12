# syntax=docker/dockerfile:1
# =============================================================================
# DevSpace — TanStack Start (SSR) production image
# =============================================================================
# Build:
#   docker compose -p dev-spaces --env-file /srv/docker/compose/.env.dev-spaces \
#     -f /srv/docker/compose/dev-spaces.yml build
# =============================================================================

FROM node:26-alpine AS base
RUN npm install -g pnpm@11.3.0
WORKDIR /app

# Full dependency tree — needed to run `vite build`.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

# Runtime dependencies only — the SSR bundle still imports react, radix-ui, etc.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json server.mjs ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.mjs"]
