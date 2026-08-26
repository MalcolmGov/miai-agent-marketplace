# Azure Deployment Config — MyInstantAI Agent Marketplace

**Principle: one image, config-only.** The Railway sandbox and the Azure production
deployment run the **same container image** built from this repo. Azure is turned on
entirely by **environment variables** — no fork, no code branch. The adapters for Azure
OpenAI, OIDC identity, an HTTP wallet/billing gateway, Postgres, Redis and Application
Insights are already in the codebase; deployment is *provisioning + wiring*, not a rewrite.

Verify any deployment at `GET /api/health` → `{ authMode, modelMode, walletMode,
mockRailsAllowed, database, storeBackend, redisConfigured, oidcIssuer, ... }`.

---

## 1. Azure resources to provision

| Resource | Purpose | Notes |
|---|---|---|
| **Azure Container Registry (ACR)** | Store the built image | `az acr build` from the repo `Dockerfile` |
| **Azure Container Apps** (or App Service for Containers) | Run the container | Min 1 replica; scale on HTTP. Health probe → `/api/health`. App also reads `WEBSITE_SITE_NAME` (App Service) if you go that route |
| **Azure Database for PostgreSQL – Flexible Server** | Durable store (replaces the file-store) | Once `DATABASE_URL` is set, all `*_STORE_PATH` file fallbacks are ignored. Migrations run on boot |
| **Azure OpenAI** | The model | Create **two deployments**: a "large" (gpt‑4o‑class) and a "small/cheap" one — the tier map routes to them |
| **Azure Cache for Redis** *(or Upstash)* | Shared session store across replicas | Optional but recommended for >1 replica |
| **Azure Key Vault** | Secrets (keys, tokens, connection strings) | Reference into Container Apps as secret env vars |
| **Application Insights** | Telemetry / logs | App reads `APPLICATIONINSIGHTS_CONNECTION_STRING` natively |
| **Identity provider** (Entra ID / partner OIDC) | Consumer sign-in | Supplies the `MIAI_OIDC_*` values |

---

## 2. Environment variables

Grouped by function. **Set the "Prod value" column; leave the mock defaults behind.**
Secrets → Key Vault. Every var below is one the code actually reads.

### 2.1 Core modes (the mock → real switches)
| Var | Prod value | Purpose |
|---|---|---|
| `MIAI_AUTH_MODE` | `oidc` | Real per-user identity (was `mock`) |
| `MIAI_MODEL_MODE` | `azure` *(or `gateway`)* | Route to Azure OpenAI (was `mock`) |
| `MIAI_WALLET_MODE` | `http` | Real billing gateway (was `mock`) |
| `SANDBOX_MODE` | *(unset)* | Turns off the sandbox turn-cap + banner |
| `ALLOW_MOCK_RAILS` / `I_UNDERSTAND_MOCK_RAILS_IN_PROD` | **leave unset** | Safety: the app **refuses to run mock rails in production** unless *both* are set. Unset ⇒ forces real rails + strong secrets |

### 2.2 Data store
| Var | Prod value | Purpose |
|---|---|---|
| `DATABASE_URL` | Azure Postgres conn string | Enables Postgres; disables the `/data` file store |
| `PG_SSL_REJECT_UNAUTHORIZED` | `true` | Azure Postgres requires SSL |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | *(if using Redis for sessions)* | Multi-replica session store |

### 2.3 Model — Azure OpenAI (`MIAI_MODEL_MODE=azure`)
| Var | Purpose |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key |
| `AZURE_OPENAI_API_VERSION` | e.g. `2024-08-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT` | small/cheap deployment name |
| `AZURE_OPENAI_DEPLOYMENT_LARGE` | large deployment name (used for the `claude-sonnet`/`gpt-4o`/`opus` tiers) |
| `EMBEDDING_API_KEY` / `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` | If using real semantic retrieval |

*Alternative — their model gateway (`MIAI_MODEL_MODE=gateway`):* `MIAI_MODEL_GATEWAY_URL`, `MIAI_MODEL_GATEWAY_KEY` (or `MIAI_MODEL_API_KEY`), optional `MIAI_MODEL_PASSTHROUGH=1`.

### 2.4 Identity / auth (`MIAI_AUTH_MODE=oidc`)
| Var | Purpose |
|---|---|
| `MIAI_OIDC_ISSUER` | Consumer OIDC issuer |
| `MIAI_OIDC_CLIENT_ID` / `MIAI_OIDC_CLIENT_SECRET` | Consumer OIDC client |
| `MIAI_OIDC_AUDIENCE` / `MIAI_OIDC_JWKS_URL` | Agents/API token validation |
| `MIAI_SESSION_SECRET` | Signs the consumer session cookie — **strong, required in prod** |
| *(or Google)* `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | If Google sign-in is the IdP instead |

### 2.5 Wallet / billing (`MIAI_WALLET_MODE=http`)
| Var | Purpose |
|---|---|
| `MIAI_WALLET_API_URL` | Billing/wallet gateway base URL |
| `MIAI_WALLET_API_KEY` | Gateway key |

### 2.6 Channels
| Var | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_SECRET` / `TELEGRAM_BOT_USERNAME` | Telegram channel (secret = webhook token + nonce signing; charset `[A-Za-z0-9_-]`) |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp channel (if enabled) |

### 2.7 App host & URLs
| Var | Purpose |
|---|---|
| `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` | Public origin of this app (deep links, webhooks) |
| `MIAI_AGENTS_AUTH_URL` / `MIAI_CONSUMER_APP_URL` (+ `NEXT_PUBLIC_` twins) | Cross-service URLs, if split |
| `CATALOG_DIR` / `CONSUMER_CATALOG_DIR` | Baked into the image already; override only if externalising the catalogue |

### 2.8 Telemetry & platform secrets
| Var | Purpose |
|---|---|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Azure App Insights |
| `MIAI_SESSION_SECRET`, `OAUTH_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, `EMBED_KEY_SECRET`, `WEBHOOK_SINK_SECRET`, `CRON_SECRET` | Strong secrets — **required** once OIDC/prod (the hardening check fails boot otherwise) |

### 2.9 Optional tool/connector keys (only if those features are on)
`BRAVE_API_KEY`/`SEARCH_API_KEY` (web search), `OPENWEATHER_API_KEY`, `YOUTUBE_API_KEY`, `PAYSTACK_*`/`STRIPE_SECRET_KEY` (payment rails), Slack/Teams IDs, etc.

---

## 3. The mock → prod switch (at a glance)

| Concern | Sandbox | Azure prod | Flipped by |
|---|---|---|---|
| Model | `mock` → `openai` | `azure` | `MIAI_MODEL_MODE` + `AZURE_OPENAI_*` |
| Identity | `mock` | `oidc` | `MIAI_AUTH_MODE` + `MIAI_OIDC_*` |
| Wallet | `mock` | `http` | `MIAI_WALLET_MODE` + `MIAI_WALLET_API_*` |
| Store | file on `/data` | Azure Postgres | presence of `DATABASE_URL` |
| Sessions | in-process | Redis | `UPSTASH_REDIS_*` |
| Mock rails | allowed | **blocked** | leave `ALLOW_MOCK_RAILS` unset |

---

## 4. Deployment flow

1. **Build & push** — `az acr build -r <acr> -t miai-web:<sha> .` (uses the repo `Dockerfile`, health at `/api/health`).
2. **Provision** the resources in §1; create the two Azure OpenAI deployments; load all secrets into Key Vault.
3. **Create the Container App** with the image + env from §2 (secrets as Key Vault references). Target port `3000` (or `PORT`).
4. **Migrations** run automatically on first boot when `DATABASE_URL` is set (`ensureMigrations`) — no separate step.
5. **Register channel webhooks** against the prod host: Telegram `setWebhook?url=https://<host>/api/consumer/telegram/webhook&secret_token=$TELEGRAM_BOT_SECRET` (WhatsApp similarly).
6. **Verify** `GET /api/health` → expect `authMode:oidc`, `modelMode:azure`, `walletMode:http`, `database:postgres`, `mockRailsAllowed:false`, secrets `hardening:ok`.

---

## 5. Multi-tenant / white-label

White-label is **per-tenant, not per-fork**: `workspaceId = brand = tenant`, and every consumer call is scoped to it, so each partner gets **isolated memory, wallet, and connectors** off the one deployment. The brand registry is `apps/web/src/lib/tenant-brands.ts`. One Azure deployment can serve several white-label partners by tenant; the sandbox is currently pinned to a single brand (`myinstantai`) for a clean demo, but the multi-tenant capability is intact.

---

## 6. Decisions still open (commercial/config, not code)

- **Model path:** Azure OpenAI direct (`azure`) vs MyInstantAI's model gateway (`gateway`).
- **Identity:** their OIDC issuer vs Google as the consumer IdP.
- **Whose Azure subscription** hosts it, and how **tenants map to partners**.
- **Regions/data residency:** pick the Azure region per market (Postgres + Azure OpenAI co-located).

None of these require code changes — they select which env values go in §2.
