# MyInstantAI — Platform Integration Contract

Binding agreement for the greenfield **Agent Marketplace** integrating with MyInstantAI rails.

## Surfaces

| Surface | Owner | Notes |
|---|---|---|
| Agent packages (`miai.agent-package/v1`) | Move Digital | Sourced from `miai-agents` |
| Marketplace UI + Agent Runtime + Connectors | Move Digital | This repo |
| Auth / SSO, Token wallet, Model gateway | MyInstantAI | Consumed via adapters |

## Market packs

Catalogue is sold as **agent families** with **US / EU / Africa / Asia / Oceania** packs (ZA merged into Africa) — 100 families × 5 markets. See [MARKET_PACKS.md](./MARKET_PACKS.md).

## Required APIs from MyInstantAI

### 1. Auth (OIDC / JWT)
- Issue workspace-scoped access tokens for Agents UI and embed keys
- Claims: `workspace_id`, `user_id`, `roles[]` (creator of a new business workspace must include `owner`)
- Optional claim: `product=agents` so the marketplace defaults to business-mode nav
- **Agents auth entry (separate from consumer Get Started):** login/signup URL that accepts:
  - `product=agents`
  - `return_to` — absolute URL back to Agents (`{APP_BASE_URL}/` or `/get-started` resume)
- Env on Agents host: `MIAI_AGENTS_AUTH_URL` / `NEXT_PUBLIC_MIAI_AGENTS_AUTH_URL`
- **Workspace provision:** on first Agents signup, mint `workspace_id` from business profile (company name) before issuing JWT
- Full B2B journey: [B2B_ONBOARDING.md](./B2B_ONBOARDING.md)

### 2. Wallet
- `GET /v1/wallets/:workspaceId` → `{ tokens }`
- `POST /v1/wallets/:workspaceId/debit` `{ amount, idempotencyKey, reason, agentId }`
- `POST /v1/wallets/:workspaceId/topup` or deep-link to existing redeem/top-up UI
- Semantics: empty balance **pauses** agent replies; entitlement remains

### 3. Model gateway
- Chat completions with tool/function calling
- Model aliases: `gemini-flash`, `gpt-4o-mini`, `claude-sonnet`, `gpt-4o`, `claude-opus`

### 4. Domain
- Preferred: `app.myinstantai.com/agents` reverse-proxy to this service
- Embed: `https://app.myinstantai.com/agents/v1/agent.js`

### 5. App channel (hosted) — MyInstantAI native apps
- Hosted messenger: `{APP_BASE_URL}/app/v1?key=mia_pk_…` (WKWebView / Android WebView / Expo shell)
- Chat API: `POST /api/app/chat` (SSE) for a fully native messenger later
- Operator surfaces (catalogue, rent, Studio, Ops): deep link or in-app browser to `{APP_BASE_URL}` — not rebuilt natively in v1
- Migration phases: [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) · detail: [APP_CHANNEL.md](./APP_CHANNEL.md)

### 6. WhatsApp
- Confirm WABA ownership (MyInstantAI BSP vs Move Digital)

## Connector OAuth

See [CONNECTOR_OAUTH.md](./CONNECTOR_OAUTH.md). Shared callback: `/api/oauth/callback`.  
Wallet/model adapters remain mockable independently of connector OAuth.

## Local / mock mode

Set `MIAI_WALLET_MODE=mock`, `MIAI_MODEL_MODE=mock`, `MIAI_AUTH_MODE=mock` to develop without live credentials.

## Azure migration

- **P0 adapters / store:** [MIGRATION_P0.md](./MIGRATION_P0.md)
- **P1 cutover runbook:** [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md)
- **Infra:** [`infra/azure/`](../infra/azure/)

## Agent package import

```bash
pnpm import:catalog   # reads ../miai-agents-audit/agents by default
```

Produces `data/catalog/*.agent.json` + `index.json`.
