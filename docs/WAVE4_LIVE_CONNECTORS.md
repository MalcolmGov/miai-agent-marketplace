# Wave 4 — live connector proof

**Goal:** Prove real connector calls (not sandbox stubs) for a Go-live subset, with History correlation IDs. Catalogue depth stays `strong`; `depth: live` is earned per agent when evidence is recorded.

## First slice (Cluster A)

| Agent | Connectors to prove |
|---|---|
| `us-executive-assistant` | Google Calendar + Slack |
| `us-dental-front-desk` | Google Calendar + Slack |
| `us-sales-qualifier` | HubSpot + Calendar + Slack |
| `us-it-helpdesk` | HubSpot ticket + Slack |

## Definition of a live proof

A proof counts only when **all** are true:

1. Studio (or App) chat `mode: live`
2. OAuth Connect completed in **Actions** (never `access_token: "demo"`)
3. Tool result has `live: true` / `stubbed: false` (History shows `liveTools`)
4. Correlation id recorded in `docs/pilots/{family}.md` Evidence line
5. Entry in `data/wave4-live-proofs.json`

Stub fallback (`source: "sandbox_stub"` or `_note: …not OAuth-connected`) is a **fail**.

## Staging checklist

1. Create OAuth apps (Google, Slack, HubSpot) with redirect  
   `{APP_BASE_URL}/api/oauth/callback`
2. Railway / `.env.local`: set `*_OAUTH_CLIENT_ID` / `*_OAUTH_CLIENT_SECRET`  
   See `CONNECTOR_OAUTH.md`
3. Redeploy → Actions badges flip **Env missing** → **Ready**
4. Connect each connector; for Slack pick the handoff channel
5. Open agent Studio → switch to **live**
6. Run golden-path prompts from the pilot doc
7. Copy correlation id from History → record:

```bash
pnpm proof:live --record \
  --agent=us-executive-assistant \
  --connector=slack \
  --corr=corr_… \
  --notes="staging handoff"
```

## Harness

```bash
# Env readiness (no network)
pnpm proof:live

# Against staging/local (requires connected OAuth)
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:live --chat
```

Status:

```bash
pnpm production:status
```

Shows Wave 4 live proofs recorded vs first-slice targets.

## Expand after first slice

Hotel guest, home-services, customer-support (Shopify + HubSpot + Slack), then remaining Go-live 18.
