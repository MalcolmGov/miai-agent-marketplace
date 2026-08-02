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

## 2. Add a volume (important for Slack OAuth)

1. Service → **Settings** → **Volumes**
2. Mount path: `/data`
3. This persists `OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json` across restarts

Without a volume, OAuth still works until the container is redeployed/restarted.

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
| `PG_SSL_REJECT_UNAUTHORIZED` | optional `1` when Postgres presents a verifiable CA (or set `PGSSLROOTCERT`) |

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
- Attach a volume at `/data` and set `RENTAL_STORE_PATH` / `OAUTH_TOKEN_STORE_PATH` / `KNOWLEDGE_STORE_PATH` under `/data` (Dockerfile defaults). Optional: set `DATABASE_URL` for Postgres rentals across redeploys.
- Without a volume or Postgres, process restarts lose file-backed state.
- Custom domain: Railway → Settings → Domains, then update `APP_BASE_URL` + all OAuth redirect URIs.
- Smoke: `BASE=https://<your-railway-host> pnpm smoke:cutover`
