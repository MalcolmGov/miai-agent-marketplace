# MyInstantAI — Platform Integration Contract

Binding agreement for the greenfield **Agent Marketplace** integrating with MyInstantAI rails.

## Surfaces

| Surface | Owner | Notes |
|---|---|---|
| Agent packages (`miai.agent-package/v1`) | Move Digital | Sourced from `miai-agents` |
| Marketplace UI + Agent Runtime + Connectors | Move Digital | This repo |
| Auth / SSO, Token wallet, Model gateway | MyInstantAI | Consumed via adapters |

## Required APIs from MyInstantAI

### 1. Auth (OIDC / JWT)
- Issue workspace-scoped access tokens for Agents UI and embed keys
- Claims: `workspace_id`, `user_id`, `roles[]`

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

### 5. WhatsApp
- Confirm WABA ownership (MyInstantAI BSP vs Move Digital)

## Connector OAuth

See [CONNECTOR_OAUTH.md](./CONNECTOR_OAUTH.md). Shared callback: `/api/oauth/callback`.  
Wallet/model adapters remain mockable independently of connector OAuth.

## Local / mock mode

Set `MIAI_WALLET_MODE=mock`, `MIAI_MODEL_MODE=mock`, `MIAI_AUTH_MODE=mock` to develop without live credentials.

## Agent package import

```bash
pnpm import:catalog   # reads ../miai-agents-audit/agents by default
```

Produces `data/catalog/*.agent.json` + `index.json`.
