# P0 — Azure / MyInstantAI migration readiness

Work completed in-repo so migration week can wire live credentials instead of inventing adapters.

## Done in this pass

| Area | What shipped |
|---|---|
| Wallet | Existing `HttpWalletAdapter` — set `MIAI_WALLET_MODE=http` + URL/key |
| Model | New `GatewayModelAdapter` — `MIAI_MODEL_MODE=gateway` + `MIAI_MODEL_GATEWAY_URL` |
| Auth | OIDC Bearer verify (`jose`) + middleware gate; mock mode unchanged |
| API auth | Protected routes resolve workspace from JWT (`requireAuth`); OAuth callback + embed + health stay public |
| Rentals | Durable store: `DATABASE_URL` (Postgres) with JSON file fallback (`RENTAL_STORE_PATH`) |
| Health | `GET /api/health` for Container Apps / Railway probes |
| Azure | Expanded [`infra/azure/main.bicep`](../infra/azure/main.bicep) — CA env, Postgres, Container App, KV, probes, wallet/model/OIDC params |
| Cutover | See [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) (P1) — DNS flip, smoke, rollback |
| Telemetry | `APPLICATIONINSIGHTS_CONNECTION_STRING` → audit events as `miai.audit.*` |

## Env contract (production)

```bash
# Auth
MIAI_AUTH_MODE=oidc
MIAI_OIDC_ISSUER=https://login.example.com/...
MIAI_OIDC_AUDIENCE=miai-agents            # optional
MIAI_OIDC_JWKS_URL=                       # optional override

# Wallet
MIAI_WALLET_MODE=http
MIAI_WALLET_API_URL=https://api.myinstantai.com
MIAI_WALLET_API_KEY=...

# Model
MIAI_MODEL_MODE=gateway                   # or openai
MIAI_MODEL_GATEWAY_URL=https://models.myinstantai.com/v1
MIAI_MODEL_GATEWAY_KEY=...
MIAI_MODEL_PASSTHROUGH=1                  # pass catalogue aliases through

# Persistence
DATABASE_URL=postgresql://...             # preferred on Azure
RENTAL_STORE_PATH=/data/rentals.json      # file fallback (Railway volume)
OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json
KNOWLEDGE_STORE_PATH=/data/knowledge-sources.json
OAUTH_TOKEN_SECRET=...                    # from Key Vault

# Public URLs
APP_BASE_URL=https://app.myinstantai.com/agents
NEXT_PUBLIC_APP_URL=https://app.myinstantai.com/agents
```

JWT claims expected: `workspace_id` (or `workspaceId` / `org_id`), `sub` / `user_id`, optional `roles[]`.

## Still needed from MyInstantAI (kickoff)

1. Real OIDC issuer + audience + sample token  
2. Wallet base URL + API key + sample debit response  
3. Model gateway URL + key + alias mapping  
4. Azure subscription / RG / who runs `az deployment`  
5. Custom domain + TLS for `APP_BASE_URL`  
6. OAuth app redirect URI updates to Azure host  
7. Key Vault secret names + managed-identity access for the Container App  

## Local verify

```bash
pnpm build:packages
pnpm --filter @miai/web build
# mock modes still default
curl -s localhost:3000/api/health
```

With Postgres:

```bash
export DATABASE_URL=postgresql://...
pnpm --filter @miai/web start
# rent an agent, restart process, confirm rental still present
```
