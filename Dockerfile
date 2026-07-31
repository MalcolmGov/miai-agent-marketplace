# Railway / staging image for MyInstantAI Agent Marketplace
FROM node:20-bookworm-slim AS base
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
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV CATALOG_DIR=/app/data/catalog
ENV OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json
ENV KNOWLEDGE_STORE_PATH=/data/knowledge-sources.json
ENV RENTAL_STORE_PATH=/data/rentals.json
# Modes default to mock for local/Railway; set http/gateway/oidc + secrets in Azure
ENV MIAI_AUTH_MODE=mock
ENV MIAI_WALLET_MODE=mock
ENV MIAI_MODEL_MODE=mock

WORKDIR /app
COPY --from=builder /app ./
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 3000
# Azure Container Apps / Railway set PORT; health at /api/health
CMD ["sh", "-c", "pnpm --filter @miai/web exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
