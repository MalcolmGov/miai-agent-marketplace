# Migration runbook — Railway staging → Azure (+ native apps)

Cutover and rollback for the Agent Marketplace (`@miai/web`), including how MyInstantAI **native iOS/Android apps** consume Agents after migration.  
Prerequisites: [MIGRATION_P0.md](./MIGRATION_P0.md) adapters + MyInstantAI kickoff credentials.  
App channel detail: [APP_CHANNEL.md](./APP_CHANNEL.md). Platform contract: [PLATFORM_INTEGRATION.md](./PLATFORM_INTEGRATION.md).

## Roles

| Role | Owns |
|---|---|
| Move Digital | Image build, app config, OAuth redirect updates, Agents smokes, App channel URL contract |
| MyInstantAI | Azure subscription / RG, DNS / Front Door, OIDC / wallet / model keys, Key Vault, **native app release** (WebView / deep links / optional native chat client) |

## Phased migration plan

Do **not** rebuild the marketplace inside native apps for v1. Agents stays a hosted service; native apps are clients.

| Phase | Outcome | Owner |
|---|---|---|
| **0 — Rails wiring** | Azure staging live; `auth=oidc`, `wallet=http`, `model=gateway`; web smoke green | Move + MIAI platform |
| **1 — DNS cutover** | Production hostname (`APP_BASE_URL`) → Azure; mock rails off; web partner demo on MIAI domain | Move + MIAI infra |
| **2 — Native operator path** | MyInstantAI apps deep-link or in-app WebView/browser to `{APP_BASE_URL}` for browse → rent → configure → Live Ops | MIAI mobile |
| **3 — Native end-user chat (pilot)** | One rented hero agent opened via App channel WebView: `{APP_BASE_URL}/app/v1?key=mia_pk_…` | MIAI mobile + Move |
| **4 — Optional native chat UI** | Native messenger calls `POST /api/app/chat` (SSE) instead of WebView — same key, wallet, runtime | MIAI mobile (backlog) |
| **5 — Hardening** | Stable Front Door hostname so app store builds don’t chase Railway/Azure FQDNs; push/offline stay MIAI-native | MIAI |

### Day-30 success (web + native-ready)

A MyInstantAI user can:

1. Sign in with MIAI SSO and rent an agent on the Agents hostname  
2. Run a live tool-backed conversation billed against the MIAI wallet  
3. Open that agent from a **native app** via App URL WebView (or documented deep link to Studio Install → App)

Full native catalogue admin and fully native chat UI are **post–day-30** unless explicitly scoped.

### Surface map

| Surface | How native apps use it | Auth |
|---|---|---|
| Marketplace / Agent Studio / Ops | Deep link or WebView to `{APP_BASE_URL}` (not rebuilt natively in v1) | OIDC Bearer / MIAI SSO session |
| End-user agent chat | Full-screen WebView → `/app/v1?key=…` **or** native UI → `POST /api/app/chat` | Publishable key `mia_pk_…` (same as embed) |
| Website embed | Unchanged — `agent.js` + `/api/embed/chat` | Publishable key |
| WhatsApp | Separate channel; WABA ownership TBD | BSP / webhook |

```
MyInstantAI iOS / Android
        │
        ├─ Operator: deep link / WebView → {APP_BASE_URL}/…  (rent, configure, ops)
        │
        └─ End-user chat:
               WebView → {APP_BASE_URL}/app/v1?key=mia_pk_…
               or native UI → POST /api/app/chat (SSE)
                        └─ same runtime, wallet, knowledge, guardrails
```

Prefer a **stable** hostname (e.g. `agents.myinstantai.com` via Front Door) from Phase 1 so native builds and App URLs do not change again at Railway decommission.

---

## Pre-cutover checklist

### Platform (Phases 0–1)

- [ ] OIDC issuer + sample JWT with `workspace_id` verified against staging
- [ ] Wallet HTTP debit/balance smoke with real API key
- [ ] Model gateway tool-calling smoke (`MIAI_MODEL_MODE=gateway`)
- [ ] Azure RG ready; `az deployment group create` permissions confirmed
- [ ] Container image pushed (ACR or GHCR) and `containerImage` param set
- [ ] `DATABASE_URL` points at Azure Postgres (or MIAI-owned store)
- [ ] Custom hostname decided (`APP_BASE_URL` / `NEXT_PUBLIC_APP_URL`) — use this in native configs
- [ ] OAuth apps updated with `https://<azure-host>/api/oauth/callback` (keep Railway URI until cutover)
- [ ] Key Vault secrets populated (wallet, model, OAuth clients, `OAUTH_TOKEN_SECRET`)
- [ ] App Insights connection string wired (`APPLICATIONINSIGHTS_CONNECTION_STRING`)

### Native apps (Phases 2–3)

- [ ] MIAI mobile owner named; target app build(s) for pilot
- [ ] Deep link / in-app browser path to Agents hostname agreed (operator surface)
- [ ] App channel WebView checklist from [APP_CHANNEL.md](./APP_CHANNEL.md) reviewed (safe areas, keyboard, no marketplace chrome)
- [ ] Pilot agent rented; App URL + `mia_pk_…` stored in native config or fetched from backend
- [ ] Staging App URL smoke on iOS Simulator + Android emulator (or `apps/mobile-shell` Expo demo)
- [ ] Confirm App URLs use the **stable** `APP_BASE_URL` host (not ephemeral Container App FQDN)
- [ ] Store-review note: WebView messenger OK for v1; fully native chat optional later

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
# Automated (health + catalog; add TOKEN for wallet/rent/agent)
BASE=https://<containerAppFqdn> pnpm smoke:cutover
BASE=https://<containerAppFqdn> TOKEN="$TOKEN" pnpm smoke:cutover

# Manual cross-check
curl -sf "$BASE/api/health" | jq .
# expect storePing=ok, database=configured, telemetry=appinsights|console

# With a real Bearer token:
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/api/wallet"
curl -sf -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"agentId":"us-customer-support"}' "$BASE/api/rent"
# Restart revision / scale to 0 then 1 — rental must still exist (Postgres)
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE/api/agents/us-customer-support"
```

Also: OAuth start (JSON) → provider consent → callback → connector shows connected; embed chat with public key.  
OAuth tokens / knowledge persist on the Azure Files mount at `/data`.

### Native / App channel smoke

```bash
# Hosted messenger (replace key from Studio → Install → App)
open "$BASE/app/v1?key=mia_pk_…&title=Assistant"

# Chat API (SSE)
curl -sN -X POST "$BASE/api/app/chat" \
  -H 'content-type: application/json' \
  -d '{"key":"mia_pk_…","message":"What are your support hours?","sessionId":"app_smoke_1"}'
```

Manual on device:

1. Rent hero agent on web → Install → App → copy URL  
2. Load URL full-screen in WKWebView / Android WebView (or `cd apps/mobile-shell && pnpm start`)  
3. Confirm: no marketplace nav, composer above keyboard, streaming reply, wallet pause if balance empty  

## Cutover

1. Freeze Railway demo writes if migrating demo rentals (usually **fresh start** on Azure).
2. Set Front Door / DNS `APP_BASE_URL` host → Azure Container App.
3. Confirm OAuth callback host is Azure-only (optional: remove Railway redirect after 24h).
4. **Native:** point app config / remote config App base URL + any hard-coded App channel hosts at the new hostname; ship or remote-toggle if builds already in review.
5. Set Railway service to maintenance or scale to zero (do not delete for 72h).
6. Watch App Insights + `/api/health` for 30–60 minutes; spot-check one native WebView chat.

### Data decision

| Choice | When |
|---|---|
| **Fresh start** (default) | Production tenants; Railway was demo-only |
| **Import rentals** | Explicit need — export `rentals.json` / Postgres dump and load into Azure Postgres `miai_rentals` |

OAuth tokens on Railway file volume are **not** portable unless you copy `OAUTH_TOKEN_STORE_PATH` + same `OAUTH_TOKEN_SECRET`. Prefer re-connect in Azure.  
Publishable App/embed keys issued after rent on Azure are authoritative for native clients — do not reuse Railway demo keys in production apps.

## Rollback

If Azure is unhealthy after cutover:

1. Flip DNS / Front Door back to Railway (`miaiweb-production.up.railway.app` or prior host).
2. Ensure Railway env still has mock-or-live credentials that worked pre-cutover.
3. Re-add Railway URL to OAuth redirect allow-lists if removed.
4. **Native:** flip remote config / App base URL back with DNS (stable Front Door host makes this a no-op for binary builds).
5. Leave Azure running for diagnosis; do not delete the RG until root cause is known.
6. File incident notes: failing check (`health`, auth, wallet, model, OAuth, app-channel), revision name, App Insights exception.

Rollback RTO target: **DNS TTL + 15 minutes** ops. Keep TTL ≤ 300s during cutover window.

## Post-cutover

- [ ] Disable Railway auto-deploy from `main` or archive the service
- [ ] Rotate any secrets that were shared with Railway
- [ ] Confirm audit events appear in App Insights (`miai.audit.*`)
- [ ] Update commercial/demo links to Azure host
- [ ] Set `EMBED_ALLOWED_ORIGINS` to production hostnames (bare `*` needs dual flags `ALLOW_EMBED_ORIGIN_STAR=1` + `I_UNDERSTAND_EMBED_ORIGIN_STAR=1` and is staging-only)
- [ ] Unset `ALLOW_MOCK_RAILS` **and** `I_UNDERSTAND_MOCK_RAILS_IN_PROD` once OIDC + wallet + model are live
- [ ] Confirm `WEBHOOK_SINK_SECRET` / `MCP_SINK_TOKEN` set if Wave4 sinks are enabled
- [ ] Native pilot: at least one production App URL path verified on iOS + Android
- [ ] Document operator deep link for support / CS playbooks
- [ ] Schedule P2: Postgres for OAuth/knowledge if still on Files; load test; optional native `/api/app/chat` client

## Env flip reference

| Env | Railway staging | Azure production |
|---|---|---|
| `MIAI_AUTH_MODE` | `mock` | `oidc` |
| `MIAI_WALLET_MODE` | `mock` | `http` |
| `MIAI_MODEL_MODE` | `mock` | `gateway` |
| `DATABASE_URL` | optional / unset | Azure Postgres |
| `RENTAL_STORE_PATH` | `/data/rentals.json` | file fallback only |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | unset | from bicep output |
| `APP_BASE_URL` | Railway URL | Azure custom host (native + App channel base) |

## Related

- [APP_CHANNEL.md](./APP_CHANNEL.md) — WebView checklist, Expo shell, SSE contract  
- [PARTNERSHIP_KICKOFF_BRIEF.md](./PARTNERSHIP_KICKOFF_BRIEF.md) — 30-day commercial kickoff  
- [MIGRATION_P1.md](./MIGRATION_P1.md) — ops / observability already shipped  
