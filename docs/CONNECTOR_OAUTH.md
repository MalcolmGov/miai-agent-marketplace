# Connector OAuth setup

All OAuth connectors use authorization code flow with a **shared** callback:

```
{APP_BASE_URL}/api/oauth/callback
```

Examples:

```
http://localhost:3000/api/oauth/callback
https://miaiweb-production.up.railway.app/api/oauth/callback
```

Register that exact redirect URI in **every** provider console.

OAuth `state` is HMAC-signed (self-contained) so consent → callback works across Railway instances. Signing key: `OAUTH_STATE_SECRET` or fallback `OAUTH_TOKEN_SECRET`.

## Why you see “Env missing”

The Connect button is only enabled when both client id **and** secret exist in the process env.  
Slack works today because `SLACK_OAUTH_CLIENT_ID` / `SLACK_OAUTH_CLIENT_SECRET` are set on Railway.  
Google, Microsoft, Shopify, HubSpot, etc. need the same treatment.

Live tool execution for those connectors is already implemented in `@miai/connectors` — credentials are the blocker, not product code.

## Env matrix

| Connector | Env vars | Notes |
|---|---|---|
| Google Calendar | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Calendar + PKCE |
| Email (Gmail) | same Google vars | Gmail send scope |
| Email (Microsoft) | `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | Pick Microsoft in Actions |
| M365 Calendar | Microsoft vars | Graph Calendars.ReadWrite |
| Teams | Microsoft vars | Also `TEAMS_TEAM_ID` + `TEAMS_CHANNEL_ID` for live handoff |
| Slack | `SLACK_OAUTH_CLIENT_ID`, `SLACK_OAUTH_CLIENT_SECRET` | Pick handoff channel after Connect |
| Shopify | `SHOPIFY_OAUTH_CLIENT_ID`, `SHOPIFY_OAUTH_CLIENT_SECRET` | Enter `*.myshopify.com` before Connect |
| HubSpot | `HUBSPOT_OAUTH_CLIENT_ID`, `HUBSPOT_OAUTH_CLIENT_SECRET` | CRM + tickets |
| Xero | `XERO_OAUTH_CLIENT_ID`, `XERO_OAUTH_CLIENT_SECRET` | Tenant resolved after consent |
| QuickBooks | `QUICKBOOKS_OAUTH_CLIENT_ID`, `QUICKBOOKS_OAUTH_CLIENT_SECRET` | `realmId` from callback query |
| Calendly | `CALENDLY_OAUTH_CLIENT_ID`, `CALENDLY_OAUTH_CLIENT_SECRET` | |
| Zendesk | `ZENDESK_OAUTH_CLIENT_ID`, `ZENDESK_OAUTH_CLIENT_SECRET` | Enter subdomain before Connect |

Also set:

```bash
APP_BASE_URL=https://<your-host>
NEXT_PUBLIC_APP_URL=https://<your-host>
OAUTH_TOKEN_SECRET=<long-random>
OAUTH_TOKEN_STORE_PATH=/data/oauth-tokens.json   # Railway volume recommended
```

Non-OAuth (credentials form in Actions): Webhook, MCP, WhatsApp, WooCommerce, Stripe.

## Railway — enable Phase 1 like Slack

1. Create OAuth apps (Google Cloud, Entra, Shopify Partners, HubSpot, …).
2. Add redirect URI: `https://miaiweb-production.up.railway.app/api/oauth/callback` (or your custom domain).
3. In Railway → `@miai/web` → Variables, add each `*_OAUTH_CLIENT_ID` / `*_OAUTH_CLIENT_SECRET` pair.
4. Redeploy.
5. Agent → **Actions** → badge flips from **Env missing** → **Ready** → **Connect with OAuth**.
6. Switch chat to **live** and exercise the tool.

### Minimum Phase 1 set (recommended next)

| Priority | Vars |
|---|---|
| 1 | `GOOGLE_OAUTH_*` (Calendar + Gmail) |
| 2 | `MICROSOFT_OAUTH_*` (M365 Calendar / Teams / Outlook mail) |
| 3 | `SHOPIFY_OAUTH_*` |
| 4 | `HUBSPOT_OAUTH_*` |

## Local

```bash
cp apps/web/.env.example apps/web/.env.local
# fill client id/secret pairs
pnpm --filter @miai/web dev
```

## Test Slack end-to-end (reference)

1. Slack app → OAuth & Permissions → redirect URL above → bot scopes `chat:write`, `channels:read`, `channels:join`, `groups:read`, `users:read`
2. Install; put Client ID/Secret in env
3. Actions → Connect Slack → pick handoff channel
4. Live chat → “speak to a human” → message in channel

Tokens are sealed in the OAuth token store (HMAC via `OAUTH_TOKEN_SECRET`). Never injected into LLM prompts.

## Wave 4 proof harness

```bash
pnpm proof:live              # env readiness
DEMO_BASE=https://… pnpm proof:live --chat
pnpm proof:live --record --agent=us-executive-assistant --connector=slack --corr=corr_…
```

Full checklist: `docs/WAVE4_LIVE_CONNECTORS.md`. Never use `access_token: "demo"` for live proof.

## Webhook (non-OAuth)

```bash
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:webhook
```

Or in Actions → Webhook: URL `{APP_BASE_URL}/api/webhook/sink` + shared secret → Save.