# Migration runbook — Railway staging → Azure

Cutover and rollback for the Agent Marketplace (`@miai/web`).  
Prerequisites: [MIGRATION_P0.md](./MIGRATION_P0.md) adapters + MyInstantAI kickoff credentials.

## Roles

| Role | Owns |
|---|---|
| Move Digital | Image build, app config, OAuth redirect updates, smoke tests |
| MyInstantAI | Azure subscription / RG, DNS / Front Door, OIDC / wallet / model keys, Key Vault access |

## Pre-cutover checklist

- [ ] OIDC issuer + sample JWT with `workspace_id` verified against staging
- [ ] Wallet HTTP debit/balance smoke with real API key
- [ ] Model gateway tool-calling smoke (`MIAI_MODEL_MODE=gateway`)
- [ ] Azure RG ready; `az deployment group create` permissions confirmed
- [ ] Container image pushed (ACR or GHCR) and `containerImage` param set
- [ ] `DATABASE_URL` points at Azure Postgres (or MIAI-owned store)
- [ ] Custom hostname decided (`APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`)
- [ ] OAuth apps updated with `https://<azure-host>/api/oauth/callback` (keep Railway URI until cutover)
- [ ] Key Vault secrets populated (wallet, model, OAuth clients, `OAUTH_TOKEN_SECRET`)
- [ ] App Insights connection string wired (`APPLICATIONINSIGHTS_CONNECTION_STRING`)

## Deploy Azure (staging)

```bash
# From repo root
az group create -n miai-agents-rg -l eastus

az deployment group create \
  -g miai-agents-rg \
  -f infra/azure/main.bicep \
  -p postgresAdminPassword='***' \
       containerImage='<acr>/miai-agent-marketplace:<tag>' \
       appHost='agents.staging.myinstantai.com' \
       oidcIssuer='https://...' \
       walletApiUrl='https://...' \
       walletApiKey='***' \
       modelGatewayUrl='https://...' \
       modelGatewayKey='***'
```

Record outputs: `containerAppFqdn`, `postgresFqdn`, `keyVaultName`, `appInsightsConnectionString`.

Point DNS / Front Door at `containerAppFqdn` (or custom domain binding on Container Apps).

## Staging smoke (before DNS cutover)

```bash
BASE=https://<containerAppFqdn>

curl -sf "$BASE/api/health" | jq .
# expect status=ok, database=configured, telemetry=appinsights|console

# With a real Bearer token:
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/api/wallet"
curl -sf -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"agentId":"us-customer-support"}' "$BASE/api/rent"
# Restart revision / scale to 0 then 1 — rental must still exist
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/api/agents/us-customer-support"
```

Also: OAuth start (JSON) → provider consent → callback → connector shows connected; embed chat with public key.

## Cutover

1. Freeze Railway demo writes if migrating demo rentals (usually **fresh start** on Azure).
2. Set Front Door / DNS `APP_BASE_URL` host → Azure Container App.
3. Confirm OAuth callback host is Azure-only (optional: remove Railway redirect after 24h).
4. Set Railway service to maintenance or scale to zero (do not delete for 72h).
5. Watch App Insights + `/api/health` for 30–60 minutes.

### Data decision

| Choice | When |
|---|---|
| **Fresh start** (default) | Production tenants; Railway was demo-only |
| **Import rentals** | Explicit need — export `rentals.json` / Postgres dump and load into Azure Postgres `miai_rentals` |

OAuth tokens on Railway file volume are **not** portable unless you copy `OAUTH_TOKEN_STORE_PATH` + same `OAUTH_TOKEN_SECRET`. Prefer re-connect in Azure.

## Rollback

If Azure is unhealthy after cutover:

1. Flip DNS / Front Door back to Railway (`miaiweb-production.up.railway.app` or prior host).
2. Ensure Railway env still has mock-or-live credentials that worked pre-cutover.
3. Re-add Railway URL to OAuth redirect allow-lists if removed.
4. Leave Azure running for diagnosis; do not delete the RG until root cause is known.
5. File incident notes: failing check (`health`, auth, wallet, model, OAuth), revision name, App Insights exception.

Rollback RTO target: **DNS TTL + 15 minutes** ops. Keep TTL ≤ 300s during cutover window.

## Post-cutover

- [ ] Disable Railway auto-deploy from `main` or archive the service
- [ ] Rotate any secrets that were shared with Railway
- [ ] Confirm audit events appear in App Insights (`miai.audit.*`)
- [ ] Update commercial/demo links to Azure host
- [ ] Schedule P2: embed CSP/CORS hardening, load test

## Env flip reference

| Env | Railway staging | Azure production |
|---|---|---|
| `MIAI_AUTH_MODE` | `mock` | `oidc` |
| `MIAI_WALLET_MODE` | `mock` | `http` |
| `MIAI_MODEL_MODE` | `mock` | `gateway` |
| `DATABASE_URL` | optional / unset | Azure Postgres |
| `RENTAL_STORE_PATH` | `/data/rentals.json` | file fallback only |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | unset | from bicep output |
| `APP_BASE_URL` | Railway URL | Azure custom host |
