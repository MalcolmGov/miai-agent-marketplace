# MyInstantAI — Production Cutover Checklist (P0-5)
**Purpose:** the go/no-go for the *first real production-config boot* — the last hard blocker from the 26-Aug readiness audit. Work top to bottom; do not open to customers until every **GO** condition is green.
**Scope:** the marketplace container on Azure (or any non-sandbox prod). Grounded in `security-flags.ts` (boot hardening), `apps/web/src/app/api/health/route.ts`, `docs/AZURE_DEPLOYMENT.md`, and `scripts/cutover-smoke.mjs`.

> The app **fails closed at boot** (`instrumentation.ts → assertBootHardening`) when prod hardening is wrong — a misconfigured deploy won't start, or `/api/health` returns **503 `hardening:fail`**. This checklist confirms it booted *correctly*, not just that it booted.

---

## 1. Environment — MUST SET

### Core mode switches
- [ ] `MIAI_AUTH_MODE=oidc`
- [ ] `MIAI_WALLET_MODE=http`
- [ ] `MIAI_MODEL_MODE=azure` *(or `gateway`)*
- [ ] `NODE_ENV=production`
- [ ] `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` = the real public origin

### Data
- [ ] `DATABASE_URL` = Azure Postgres connection string
- [ ] `PG_SSL_REJECT_UNAUTHORIZED=true` *(or unset — the code defaults to verify-TLS; only `0` is dangerous)*
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — **required before running more than one replica** (rate limits + sessions are per-instance without it; the boot logs `miai.rate_limit_per_instance` if absent)

### Model — Azure OpenAI (`MIAI_MODEL_MODE=azure`)
- [ ] `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`
- [ ] `AZURE_OPENAI_DEPLOYMENT` (small) + `AZURE_OPENAI_DEPLOYMENT_LARGE`
- [ ] *(gateway path instead:* `MIAI_MODEL_GATEWAY_URL` + `MIAI_MODEL_GATEWAY_KEY`)*

### Identity (OIDC)
- [ ] `MIAI_OIDC_ISSUER`, `MIAI_OIDC_CLIENT_ID`, `MIAI_OIDC_CLIENT_SECRET`
- [ ] `MIAI_OIDC_AUDIENCE`, `MIAI_OIDC_JWKS_URL`

### Wallet (MyInstantAI gateway — the P0-4 decision)
- [ ] `MIAI_WALLET_API_URL`, `MIAI_WALLET_API_KEY`
- [ ] ⚠️ Confirm the MyInstantAI wallet gateway is **live, durable, and idempotent** (this is the outstanding MyInstantAI-side dependency; without it, `walletMode:http` points at nothing)

### Secrets — all strong (≥16 chars, not a dev default), from Key Vault
- [ ] `OAUTH_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, `EMBED_KEY_SECRET`  *(boot fails closed if any is weak)*
- [ ] `MIAI_SESSION_SECRET`, `WEBHOOK_SINK_SECRET`, `CRON_SECRET`  *(boot now flags these if **set-but-weak** — PR #102)*

### Telemetry
- [ ] `APPLICATIONINSIGHTS_CONNECTION_STRING`

---

## 2. Environment — MUST **UNSET** (these silently weaken prod)

- [ ] `SANDBOX_MODE` — **unset.** If set alongside real rails, boot now refuses (PR #97). This is the #1 thing to verify.
- [ ] `ALLOW_MOCK_RAILS` / `I_UNDERSTAND_MOCK_RAILS_IN_PROD` — unset (these force mock auth/wallet)
- [ ] `ALLOW_SANDBOX_IN_PROD` / `I_UNDERSTAND_SANDBOX_IN_PROD` — unset
- [ ] `ALLOW_EMBED_ORIGIN_STAR` / `I_UNDERSTAND_EMBED_ORIGIN_STAR` — unset
- [ ] `ALLOW_FILE_FALLBACK_IN_PROD` / `I_UNDERSTAND_FILE_FALLBACK_IN_PROD` — unset
- [ ] `PG_SSL_REJECT_UNAUTHORIZED` **not** `0`

---

## 3. `GET /api/health` — the go/no-go table

`curl -s https://<fqdn>/api/health | jq` and confirm **every** row. GO requires HTTP **200** *and* `status:"ok"`.

| Field | Required prod value | Why it matters |
|---|---|---|
| `status` | `ok` (HTTP 200) | `degraded` = incomplete config or Redis down; `failing` (503) = hardening failed |
| `hardening` | `ok` | `fail` ⇒ 503; the boot gate rejected the config |
| `mockRailsAllowed` | **`false`** | `true` = mock auth/wallet or a leaked SANDBOX flag — **NO-GO** |
| `sandboxMode` | **`false`** | `true` = `SANDBOX_MODE=1` on prod — **NO-GO** (PR #97 surfaces this) |
| `nodeEnv` | `production` | anything else disables hardening — **NO-GO** |
| `authMode` | `oidc` | real per-user identity |
| `walletMode` | `http` | real billing gateway |
| `modelMode` | `azure` / `gateway` | real model |
| `database` | `configured` | Postgres wired, not the file fallback |
| `storeBackend` | `postgres` | confirms the store is actually Postgres |
| `storePing` / `store` | `ok` / `hydrated` | DB reachable + migrations applied |
| `oidcIssuer` / `walletUrl` / `modelUrl` | `set` | ⚠️ **presence only, not reachability** — §5 smoke proves reachability |
| `redisConfigured` / `redisPing` | `true` / `ok` | required before >1 replica |
| `config` | *absent* (not `incomplete`) | `incomplete` ⇒ a required partner URL is missing |

---

## 4. Cutover smoke — `pnpm smoke:cutover`

**Anonymous pass** (health + catalog + embed-401):
```bash
BASE=https://<fqdn> pnpm smoke:cutover
```
- [ ] All checks `✓`; the logged line reads `auth=oidc wallet=http model=azure store=postgres/ok`.

**Authenticated pass** — after a real OIDC login, grab the Bearer token:
```bash
BASE=https://<fqdn> TOKEN=<real-oidc-jwt> pnpm smoke:cutover
```
- [ ] `wallet`, `rent <agent>`, `agent <id>` all `✓` (proves the OIDC → wallet → rent → agent path end-to-end).

---

## 5. Live end-to-end proof (what `/api/health` can't confirm)

Health checks env **presence**, not that the endpoints actually work. Prove each once:
- [ ] **Real OIDC login** in a browser → lands authenticated (not the mock/demo identity).
- [ ] **One real chat turn** returns a genuine model answer — **not** a deterministic mock line. *(Guards the known gap: `checkProductionRails` verifies `MIAI_MODEL_MODE≠mock` but not that the model KEY is present, so a missing/rotated key silently falls back to mock. A real, varied answer proves the key works.)*
- [ ] **One live connector action** (e.g. a real Slack post or calendar booking on a **connected** connector) succeeds — and an **unconnected** connector returns the honest "couldn't complete" (PR #99), never a fake confirmation.
- [ ] **One real wallet debit** reflected in the MyInstantAI gateway ledger (confirms billing is durable, not the mock wallet).

**Optional (costs model tokens):**
```bash
BASE=https://<fqdn> pnpm smoke:live-llm         # single live-LLM smoke
BASE=https://<fqdn> pnpm smoke:live-llm:matrix  # broader matrix
```
- [ ] Live-LLM smoke passes (this is also the start of closing the still-open *live-model eval* gap).

---

## 6. Known gaps to handle during cutover (from the audit)

- [ ] **Migrations run on first request, not at boot** (`ensureMigrations` fires on first Postgres access; the first `/api/health` triggers it). A migration failure surfaces as a degraded health / 500, not a failed deploy — so **hit `/api/health` and confirm `store:hydrated` before opening to traffic.** See `docs/MIGRATION_RUNBOOK.md`.
- [ ] **Bicep hard-wires `MIAI_MODEL_MODE=gateway`** — if you're taking the **azure** model path, edit `infra/azure/main.bicep` to add the `AZURE_OPENAI_*` env + toggle first (the doc leads with azure, the shipped template implements gateway).
- [ ] **No gated/audited prod release yet** — put the `az deployment` behind a reviewer-gated GitHub Environment on a pinned image SHA, and **verify a rollback** (redeploy the previous GHCR tag) before real traffic.
- [ ] **Redis before scale** — the Bicep caps `maxReplicas` at 1; provision Upstash/Azure Cache and set `UPSTASH_*` before raising it, or rate limits/sessions won't be shared.

---

## Go / No-Go summary

**GO only when:** §1 set · §2 unset · §3 every row green (`mockRailsAllowed:false`, `sandboxMode:false`, `hardening:ok`, `storeBackend:postgres`) · §4 both smoke passes · §5 real login + real chat + live connector + real debit all proven.

**Any of these is an immediate NO-GO:** `mockRailsAllowed:true` · `sandboxMode:true` · `nodeEnv≠production` · `hardening:fail` · a chat turn that returns a canned/mock answer · the MyInstantAI wallet gateway not yet durable.
