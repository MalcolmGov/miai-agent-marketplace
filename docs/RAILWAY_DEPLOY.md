# Railway staging deploy checklist

Use Railway (long-lived Node) so OAuth tokens + in-memory rentals survive a demo session.

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
| `OAUTH_TOKEN_SECRET` | long random string |
| `OAUTH_TOKEN_STORE_PATH` | `/data/oauth-tokens.json` |
| `KNOWLEDGE_STORE_PATH` | `/data/knowledge-sources.json` |
| `CATALOG_DIR` | `/app/data/catalog` |
| `NODE_ENV` | `production` |

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

- This is **staging**, not full production: wallet/model are still mocks.
- Redeploys wipe in-memory rentals; OAuth tokens survive if the `/data` volume is attached.
- Custom domain: Railway → Settings → Domains, then update `APP_BASE_URL` + all OAuth redirect URIs.
