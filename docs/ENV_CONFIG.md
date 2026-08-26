# MyInstantAI — Environment Config Diff (Sandbox vs Staging)
**Date:** 2026-08-26
**Envs:** Demo sandbox = `miaiweb-production-f4cb…` (Railway `grateful-playfulness`) · Staging = `miaiweb-production…` (Railway `robust-enthusiasm`). Both deploy `main`, so the **code is identical** — only **env config** differs.
**How to use:** I can't read Railway secret *values*, so the "Set?" columns are for **you** to tick against each project's Variables. §1 is observable ground truth; §3 is the short list that actually matters before MyInstantAI tests.

---

## 1. Observable diff (from `/api/health`, ground truth)

| Field | Sandbox `-f4cb` | Staging `miaiweb-production` | Same? |
|---|---|---|---|
| `sandboxMode` | **true** | **false** | ✗ — the key difference |
| `database` / `storeBackend` | file-fallback / file | **configured / postgres** | ✗ |
| `redisConfigured` | **false** | **true** | ✗ |
| `mockRailsAllowed` | true (via SANDBOX_MODE) | true (via mock-rails dual-ack) | ✗ mechanism |
| `nodeEnv` | production | production | ✓ |
| `authMode` / `walletMode` | mock / mock | mock / mock | ✓ |
| `modelMode` / `modelUrl` | openai / set | openai / set | ✓ (OpenAI key set on both) |
| `hardening` | ok | ok | ✓ |
| `telemetry` | console | console | ✓ (App Insights not set on either) |

**Read:** every difference is **deliberate** (§2). Auth, wallet, model, and hardening are already aligned.

---

## 2. The deliberate differences — do NOT mirror

These are *why* the two envs exist; leave them as-is.

- **`SANDBOX_MODE`** — `1` on the sandbox (stubs connectors, model turn-cap, frictionless demo) vs **unset** on staging (connectors run **live**). This single flag is the whole reason staging can test connectors and the sandbox can't.
- **`DATABASE_URL` + `UPSTASH_REDIS_REST_URL/TOKEN`** — set on staging (real Postgres + Redis), absent on the sandbox (file store). Keep it that way.
- **Mock-rails mechanism** — sandbox uses `SANDBOX_MODE`; staging uses **`ALLOW_MOCK_RAILS=1` + `I_UNDERSTAND_MOCK_RAILS_IN_PROD=1`**. Both land on mock auth/wallet; different route there.

---

## 3. Action items — verify/set on **STAGING** before MyInstantAI tests

This is the short list that actually gates connector + channel testing.

| Var(s) | Powers | Why it matters on staging | Set? |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` · `_SECRET` · `_USERNAME` | Telegram channel | Set on the **sandbox** this session; staging needs its **own bot** (one bot can't point its webhook at two hosts). Register a separate prod bot, set these, and `setWebhook` → staging's `/api/consumer/telegram/webhook`. | ☐ |
| `GOOGLE_OAUTH_CLIENT_ID` · `_SECRET` | Google sign-in **and** the Google Calendar / Gmail connectors (**dual use!**) | On the sandbox this was a placeholder → Google OAuth never worked. Staging needs a **real** one for those connectors to connect. | ☐ |
| `SLACK_OAUTH_CLIENT_ID` · `_SECRET` | Slack connector | Needed to connect Slack. | ☐ |
| `HUBSPOT_OAUTH_CLIENT_ID` · `_SECRET` | HubSpot connector | " | ☐ |
| `SHOPIFY_OAUTH_CLIENT_ID` · `_SECRET` | Shopify connector | " | ☐ |
| `MICROSOFT_OAUTH_CLIENT_ID` · `_SECRET` | M365 Calendar / Teams | " | ☐ |
| `XERO` · `QUICKBOOKS` · `CALENDLY` · `ZENDESK` `_OAUTH_CLIENT_ID/_SECRET` | those connectors | Set for whichever you want tested. | ☐ |
| `SLACK_DEFAULT_CHANNEL` | Slack notify/handoff | Slack throws if connected but no default channel. | ☐ |
| `TEAMS_TEAM_ID` + `TEAMS_CHANNEL_ID` | Teams escalations | Teams fails closed without both. | ☐ |
| `HANDOFF_EMAIL_TO` | Email handoff fallback | Fallback recipient. | ☐ |
| `STRIPE_SECRET_KEY` | Stripe payment-link connector | Only if testing Stripe links. | ☐ |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp channel | Only if testing WhatsApp. | ☐ |
| `QUICKBOOKS_ENV` | QuickBooks | Defaults to sandbox host unless set to `production`. | ☐ |

**Per connector, two things must be true to connect on staging:** (1) the client id/secret above are set, **and** (2) the staging callback URL — `https://miaiweb-production.up.railway.app/api/oauth/callback` — is registered in that OAuth app's allowed redirect URIs (else `redirect_uri_mismatch`). Once #104 (verify-on-connect) redeploys, a connected-but-broken connector shows **"⚠ reconnect"** — use that as your test signal.

---

## 4. Secrets — check on both, but keep them **distinct per env**

Both currently boot `hardening:ok`, so the required ones are present. Staging carries real Postgres + encrypted connector tokens, so its secrets matter more.

| Secret | Required when | Note |
|---|---|---|
| `OAUTH_TOKEN_SECRET` | always (non-mock or OIDC) | Also the AES key for connector tokens at rest — tokens connected on one env can't be read on another with a different key (you re-connect per env anyway). |
| `OAUTH_STATE_SECRET` · `EMBED_KEY_SECRET` | " | boot-checked |
| `MIAI_SESSION_SECRET` · `WEBHOOK_SINK_SECRET` · `CRON_SECRET` | if set | **#102** now fails boot if any is **set-but-weak** |

Don't reuse the sandbox's secrets on staging (different trust levels).

---

## 5. Full inventory by function (reference — everything the code reads)

Grouped; the ones that matter are already flagged above. Most below are shared/aligned or irrelevant to these two Railway envs.

- **Core / rails:** `SANDBOX_MODE`, `SANDBOX_MODEL_TURN_CAP`, `MIAI_AUTH_MODE`, `MIAI_WALLET_MODE`, `MIAI_MODEL_MODE`, `ALLOW_MOCK_RAILS`, `I_UNDERSTAND_MOCK_RAILS_IN_PROD`, `NODE_ENV`
- **Data / infra:** `DATABASE_URL`, `MIAI_DATABASE_URL`, `PG_SSL_REJECT_UNAUTHORIZED`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, plus the file-store paths (`*_STORE_PATH`, `DATA_DIR`) — only used in the sandbox's file mode, ignored once `DATABASE_URL` is set
- **Model:** `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL_DEFAULT`, `ANTHROPIC_API_KEY`, `MIAI_MODEL_GATEWAY_URL/KEY`, `MIAI_MODEL_API_KEY`, `MIAI_MODEL_PASSTHROUGH`, `AZURE_OPENAI_*` (future Azure prod only), `EMBEDDING_*`, `RUNTIME_KNOWLEDGE_CHARS`, `RUNTIME_MAX_TOOL_ROUNDS`, `RUNTIME_SEMANTIC_RETRIEVAL`, `KNOWLEDGE_MAX_CHARS`
- **Identity / wallet (for real prod):** `MIAI_OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET/AUDIENCE/JWKS_URL`, `MIAI_WALLET_API_URL/KEY`, `MIAI_MOCK_ROLES`
- **Channels:** `TELEGRAM_BOT_TOKEN/SECRET/USERNAME`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- **Connector OAuth creds:** `GOOGLE_`, `SLACK_`, `HUBSPOT_`, `SHOPIFY_`, `MICROSOFT_`, `XERO_`, `QUICKBOOKS_`, `CALENDLY_`, `ZENDESK_`, `NOTION_`, `SPOTIFY_`, `TODOIST_` `…_OAUTH_CLIENT_ID/_SECRET`
- **Connector runtime config:** `SLACK_DEFAULT_CHANNEL`, `TEAMS_TEAM_ID`, `TEAMS_CHANNEL_ID`, `HANDOFF_EMAIL_TO`, `STRIPE_SECRET_KEY`, `QUICKBOOKS_ENV`
- **Payments (platform top-up — being dropped, P0-4):** `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_CURRENCY`
- **Tools / search (optional):** `BRAVE_API_KEY`, `BRAVE_SEARCH_API_KEY`, `SEARCH_API_KEY`, `OPENWEATHER_API_KEY`, `WEATHER_API_KEY`, `YOUTUBE_API_KEY`
- **Host / URLs / CORS:** `APP_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `MIAI_AGENTS_AUTH_URL`, `MIAI_CONSUMER_APP_URL` (+ `NEXT_PUBLIC_` twins), `EMBED_ALLOWED_ORIGINS`, `MIAI_MAX_BODY_BYTES`
- **Secrets / platform endpoints:** `OAUTH_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, `EMBED_KEY_SECRET`, `MIAI_SESSION_SECRET`, `WEBHOOK_SINK_SECRET`, `CRON_SECRET`, `MCP_SINK_TOKEN`, `WEBHOOK_SINK_HMAC_ONLY`
- **Telemetry / catalog / build:** `APPLICATIONINSIGHTS_CONNECTION_STRING`, `CATALOG_DIR`, `CONSUMER_CATALOG_DIR` (baked into image), `GIT_COMMIT_SHA`, `RAILWAY_*`, `WEBSITE_SITE_NAME`
- **Proof/demo scaffolding + smoke-script args (not deployment config):** `PROOF_*`, `DEMO_*`, `MCP_PROOF_TOKEN`, `WEBHOOK_PROOF_SECRET`, `ADMIN_NARRATIVE_ECONOMICS`, `SMOKE_AGENT_ID`, `BASE`, `TOKEN`, `LIVE_LLM_MATRIX`

---

## Bottom line

The two envs are the **same code**; only **§2 (deliberate)** and **§3 (a dozen feature-config vars)** differ. To let MyInstantAI test connectors on staging, work **§3**: connector OAuth creds + their redirect URIs, the connector runtime config, and (if you want it) a staging Telegram bot. Nothing else needs mirroring.
