# Railway / staging image for MyInstantAI Agent Marketplace
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/runtime/package.json ./apps/runtime/
COPY apps/connectors/package.json ./apps/connectors/
COPY packages/agent-protocol/package.json ./packages/agent-protocol/
COPY packages/wallet-adapter/package.json ./packages/wallet-adapter/
COPY packages/connectors/package.json ./packages/connectors/
COPY packages/presets/package.json ./packages/presets/
COPY packages/runtime/package.json ./packages/runtime/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build:packages
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @miai/web build

FROM base AS runner
# gosu lets the entrypoint drop from root to the node user after fixing the mounted-volume owner.
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
ARG GIT_COMMIT_SHA=unknown
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CATALOG_DIR=/app/data/catalog
ENV CONSUMER_CATALOG_DIR=/app/data/catalog-consumer
ENV OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json
ENV KNOWLEDGE_STORE_PATH=/data/knowledge-sources.json
ENV RENTAL_STORE_PATH=/data/rentals.json
# Consumer memory (facts, life-graph goals/people, reminders, daily brief). When DATABASE_URL is
# set these use Postgres and the paths are ignored; in file-store mode (e.g. the sandbox) they MUST
# live on the mounted /data volume, otherwise `next start` (cwd /app/apps/web) resolves the default
# to /app/data — inside the image — and a person's memory is wiped on every redeploy.
ENV CONSUMER_MEMORY_STORE_PATH=/data/consumer-memory.json
ENV CONSUMER_GOALS_STORE_PATH=/data/consumer-goals.json
ENV CONSUMER_PEOPLE_STORE_PATH=/data/consumer-people.json
ENV CONSUMER_REMINDERS_STORE_PATH=/data/consumer-reminders.json
ENV CONSUMER_TELEGRAM_STORE_PATH=/data/telegram-bindings.json
ENV BRIEF_STORE_PATH=/data/consumer-brief.json
# Modes default to mock for local/Railway; set http/gateway/oidc + secrets in Azure
ENV MIAI_AUTH_MODE=mock
ENV MIAI_WALLET_MODE=mock
ENV MIAI_MODEL_MODE=mock

WORKDIR /app
# Standalone runner: only copy compiled JS artifacts, static assets, and runtime catalog.
# Strips all raw TypeScript sources, unit tests, internal eval harnesses, and git metadata.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/data/catalog ./data/catalog
COPY --from=builder /app/data/catalog-consumer ./data/catalog-consumer

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /data && chown -R node:node /data /app && chmod +x /usr/local/bin/docker-entrypoint.sh
# No `USER node`: the entrypoint starts as root only to chown the mounted /data volume (which is
# mounted root-owned at runtime), then drops to the node user via gosu before running the server.

EXPOSE 3000
# Azure Container Apps / Railway set PORT; health at /api/health
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
