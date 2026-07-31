# Connector OAuth setup

All OAuth connectors use authorization code flow with a shared callback:

`{APP_BASE_URL}/api/oauth/callback`

Redirect URI to register in every provider console:

```
http://localhost:3000/api/oauth/callback
```

(Production: `https://your-host/api/oauth/callback`)

## Env

Copy `apps/web/.env.example` → `apps/web/.env.local` and fill client id/secret pairs.

| Connector | Env vars | Notes |
|---|---|---|
| Google Calendar | `GOOGLE_OAUTH_*` | Calendar scopes + PKCE |
| Email (Gmail) | `GOOGLE_OAUTH_*` | Gmail send scope |
| Email (Microsoft) | `MICROSOFT_OAUTH_*` | Choose Microsoft in Actions |
| M365 Calendar | `MICROSOFT_OAUTH_*` | Graph Calendars.ReadWrite |
| Teams | `MICROSOFT_OAUTH_*` | Also set `TEAMS_TEAM_ID` + `TEAMS_CHANNEL_ID` |
| Slack | `SLACK_OAUTH_*` | After Connect, pick handoff channel in Actions UI (`channels:join` scope; reconnect once if upgrading) |
| Shopify | `SHOPIFY_OAUTH_*` | Enter `*.myshopify.com` before Connect |
| HubSpot | `HUBSPOT_OAUTH_*` | CRM + tickets |
| Xero | `XERO_OAUTH_*` | Tenant resolved after consent |
| QuickBooks | `QUICKBOOKS_OAUTH_*` | `realmId` from callback |
| Calendly | `CALENDLY_OAUTH_*` | |
| Zendesk | `ZENDESK_OAUTH_*` | Enter subdomain before Connect |

Non-OAuth (credentials form in Actions): Webhook, MCP, WhatsApp, WooCommerce, Stripe.

## Test Slack end-to-end

1. Create a Slack app → OAuth & Permissions → redirect URL above → bot scopes `chat:write`, `channels:read`, `channels:join`, `groups:read`, `users:read`
2. Install to workspace; put Client ID/Secret in env (Railway / `.env.local`)
3. Agent → **Actions** → **Connect with OAuth** on Slack (Reconnect if scopes changed)
4. Pick a handoff channel in the dropdown → **Set handoff channel**
5. Private channels: run `/invite @YourBot` once if prompted
6. Switch chat to **live (OAuth APIs)** → “speak to a human”
7. Expect a handoff post in the picked channel (`SLACK_DEFAULT_CHANNEL` is legacy fallback only)

Tokens are sealed in `data/oauth-tokens.json` (HMAC via `OAUTH_TOKEN_SECRET`). Never injected into LLM prompts.
