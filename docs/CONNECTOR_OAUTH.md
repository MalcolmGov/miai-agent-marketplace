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
| Slack | `SLACK_OAUTH_*` | Set `SLACK_DEFAULT_CHANNEL` (channel ID) |
| Shopify | `SHOPIFY_OAUTH_*` | Enter `*.myshopify.com` before Connect |
| HubSpot | `HUBSPOT_OAUTH_*` | CRM + tickets |
| Xero | `XERO_OAUTH_*` | Tenant resolved after consent |
| QuickBooks | `QUICKBOOKS_OAUTH_*` | `realmId` from callback |
| Calendly | `CALENDLY_OAUTH_*` | |
| Zendesk | `ZENDESK_OAUTH_*` | Enter subdomain before Connect |

Non-OAuth (credentials form in Actions): Webhook, MCP, WhatsApp, WooCommerce, Stripe.

## Test Slack end-to-end

1. Create a Slack app → OAuth & Permissions → redirect URL above → scopes `chat:write`, `channels:read`
2. Install to workspace; put Client ID/Secret in `.env.local`
3. Invite the bot to a channel; set `SLACK_DEFAULT_CHANNEL` to that channel’s ID
4. Restart `pnpm --filter @miai/web dev`
5. Agent → **Actions** → **Connect with OAuth** on Slack
6. Switch chat to **live (OAuth APIs)** → message “speak to a human”
7. Expect a handoff post in Slack

Tokens are sealed in `data/oauth-tokens.json` (HMAC via `OAUTH_TOKEN_SECRET`). Never injected into LLM prompts.
