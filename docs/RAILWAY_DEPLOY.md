# Railway staging deploy checklist

Use Railway (long-lived Node) so OAuth tokens + in-memory rentals survive a demo session.

## CI before deploy

Pull requests and pushes to `main` run GitHub Actions CI (`.github/workflows/ci.yml`): build, typecheck, lint, unit tests, static eval suite, and a secrets scan. Merges are gated on green CI. A separate nightly workflow (`.github/workflows/eval-nightly.yml`) runs the full mock eval suite on a schedule; it does not block PRs.

Locally: `pnpm run ci` mirrors the main quality gate (without lint/audit/secrets).

## 1. Push the repo

Create a GitHub repo for `miai-agent-marketplace` (or push this folder), then in Railway:

1. **New Project** → **Deploy from GitHub**
2. Select this repo
3. Railway should pick up `railway.toml` + `Dockerfile`

Root directory: **repo root** (not `apps/web`).

## 2. Persist state (Postgres preferred; volume as file fallback)

**Preferred: Postgres.** Set `DATABASE_URL` (or `MIAI_DATABASE_URL`). On boot the app runs versioned migrations (`apps/web/migrations/001_init.sql`) and persists:

| Store | Postgres table | File fallback env |
|---|---|---|
| Rentals + audit | `miai_rentals`, `miai_audit` | `RENTAL_STORE_PATH` |
| Turn transcripts | `miai_turns` | (under data dir) |
| OAuth tokens | `miai_oauth_tokens` | `OAUTH_TOKEN_STORE_PATH` |
| Knowledge sources | `miai_knowledge_sources` | `KNOWLEDGE_STORE_PATH` |
| Workspace members | `miai_workspace_members` | `WORKSPACE_MEMBERS_PATH` |
| Ask leads | `miai_ask_leads` | `ASK_LEADS_PATH` |
| Custom requests | `miai_custom_requests` | `CUSTOM_REQUESTS_PATH` |

Writes are **row-level upserts** (no full-table wipe). File fallback still works when `DATABASE_URL` is unset (local/CI).

**Volume (file fallback / dual-write safety)** — attach in the Railway dashboard (not configurable in `railway.toml`):

1. Service → **Settings** → **Volumes**
2. Mount path: `/data`
3. Keep Dockerfile defaults: `OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json`, `KNOWLEDGE_STORE_PATH=/data/knowledge-sources.json`, `RENTAL_STORE_PATH=/data/rentals.json`

Without a volume **and** without `DATABASE_URL`, process restarts lose durable state.

**Optional Upstash Redis** (shared rate limits + chat sessions across replicas):

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |

When set, rate limits (`miai:rl:*`) and chat sessions (`miai:chan:*`, `miai:ask:*`) are shared across replicas. Without them, those stay in-process (fine for one replica). `REDIS_URL` is reserved for a future native client and is unused in v1.

Catalogue reads (`index.json`, `families.json`) are memoized in-process with mtime invalidation — no Redis needed.

## 3. Set environment variables

Service → **Variables**. Minimum for a customer-like walk:

| Variable | Value |
|---|---|
| `APP_BASE_URL` | `https://YOUR_SERVICE.up.railway.app` (or custom domain) |
| `NEXT_PUBLIC_APP_URL` | same as `APP_BASE_URL` |
| `OAUTH_TOKEN_SECRET` | long random string (≥16 chars, not a default) |
| `OAUTH_TOKEN_STORE_PATH` | `/data/oauth-tokens.json` |
| `KNOWLEDGE_STORE_PATH` | `/data/knowledge-sources.json` |
| `CATALOG_DIR` | `/app/data/catalog` |
| `NODE_ENV` | `production` |
| `ALLOW_MOCK_RAILS` | `1` while auth/wallet/model stay mock |
| `I_UNDERSTAND_MOCK_RAILS_IN_PROD` | `1` — **required with** `ALLOW_MOCK_RAILS` (dual escape hatch) |
| `ALLOW_EMBED_ORIGIN_STAR` | `1` only if you still need `EMBED_ALLOWED_ORIGINS=*` on staging |
| `I_UNDERSTAND_EMBED_ORIGIN_STAR` | `1` — **required with** `ALLOW_EMBED_ORIGIN_STAR` |
| `WEBHOOK_SINK_SECRET` | long random — required for `/api/webhook/sink` in production |
| `MCP_SINK_TOKEN` | long random — required for `/api/mcp` in production |
| `DATABASE_URL` | Postgres connection string (preferred durability) |
| `PG_SSL_REJECT_UNAUTHORIZED` | optional `1` when Postgres presents a verifiable CA (or set `PGSSLROOTCERT`) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional — multi-replica rate limits + sessions |

**Mock rails (staging demos):** both `ALLOW_MOCK_RAILS=1` **and** `I_UNDERSTAND_MOCK_RAILS_IN_PROD=1` are required, or boot/health fail closed. Setting only one flag also fails. Boot emits a structured warning when mock rails are enabled. Unset **both** at customer cutover when OIDC + wallet + model gateway are live.

**Embed `*` CORS:** same dual-flag pattern (`ALLOW_EMBED_ORIGIN_STAR` + `I_UNDERSTAND_EMBED_ORIGIN_STAR`). Prefer an explicit `EMBED_ALLOWED_ORIGINS` allowlist.

**Webhooks:** outbound connectors send `x-miai-signature: v1=<hmac>` + `x-miai-timestamp`. The proof sink accepts HMAC (preferred) and legacy raw secret for one transition window.

Add connector secrets as you test them, e.g. Slack:

| Variable | Value |
|---|---|
| `SLACK_OAUTH_CLIENT_ID` | from Slack app |
| `SLACK_OAUTH_CLIENT_SECRET` | from Slack app |
| `SLACK_DEFAULT_CHANNEL` | channel ID (`C…`) |

Full list: `apps/web/.env.example`.

After the first deploy, copy the public URL into `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` and **redeploy** so OAuth redirect_uri is correct.

## 4. Register OAuth redirect URLs

For each provider you test, add:

```text
https://YOUR_SERVICE.up.railway.app/api/oauth/callback
```

**Slack example**
1. api.slack.com/apps → your app → **OAuth & Permissions**
2. Redirect URL → paste callback above
3. Scopes: `chat:write`, `channels:read`, `groups:read`, `users:read`
4. Install app to workspace; invite bot to the channel; set `SLACK_DEFAULT_CHANNEL`

## 5. Smoke the customer path

1. Open `https://YOUR_SERVICE.up.railway.app`
2. Open **US Customer Support** → **Rent & configure**
3. Model + knowledge → **Mark rented → ready**
4. **Actions** → **Connect with OAuth** (Slack)
5. Switch chat to **live (OAuth APIs)** → “speak to a human”
6. **Install** → copy `agent.js` snippet (use the Railway host)

## 6. CLI alternative

```bash
# from repo root
npm i -g @railway/cli   # or: brew install railway
railway login
railway init
railway up
railway variables set APP_BASE_URL=https://YOUR_SERVICE.up.railway.app
railway variables set NEXT_PUBLIC_APP_URL=https://YOUR_SERVICE.up.railway.app
railway variables set OAUTH_TOKEN_SECRET=$(openssl rand -hex 32)
railway variables set OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json
railway variables set CATALOG_DIR=/app/data/catalog
```

Attach a volume at `/data` in the dashboard after `railway up`.

## Notes

- This is **staging**, not full production: wallet/model default to mocks until MIAI credentials are set.
- Prefer `DATABASE_URL` for durable multi-writer state (all app stores). Attach a `/data` volume as file fallback.
- Without a volume or Postgres, process restarts lose file-backed state.
- For multiple replicas, add optional Upstash Redis env vars (see section 2) so rate limits and chat sessions stay consistent.
- Custom domain: Railway → Settings → Domains, then update `APP_BASE_URL` + all OAuth redirect URIs.
- Smoke: `BASE=https://<your-railway-host> pnpm smoke:cutover`
