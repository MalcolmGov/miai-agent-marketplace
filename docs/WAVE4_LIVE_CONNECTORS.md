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

### Cheap assurance (preferred — no LLM tokens)

```bash
# Family → connector matrix (offline, $0)
pnpm proof:bindings
pnpm proof:bindings --golive100

# Platform OAuth probes — Slack auth.test / Calendar list / HubSpot account (no LLM)
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:probe

# Scripted live tools — bypass the model; calendar reads by default
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:tools --golive100 --auto-record
# Optional side-effect writes (Slack handoff / HubSpot capture):
DEMO_BASE=https://… pnpm proof:tools --golive18 --writes --auto-record
```

`POST /api/oauth/{connector}/test` and `POST /api/proof/tool` are gated by mock-rails dual-ack on staging, or `PROOF_HARNESS_SECRET` + `x-miai-proof` header after cutover.

### LLM chat proofs (expensive — featured demos / flaky model paths)

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

## Webhook (generic backend)

Prove any vertical that posts to the tenant’s URL (hotel guest request, FNOL, PMS, etc.).

```bash
# Configure + live-prove us-hotel-guest make_guest_request
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:webhook

# Or point at your own URL
DEMO_BASE=https://… pnpm proof:webhook --url=https://hooks.example.com/miai
```

Self-hosted sink (after deploy): `{APP_BASE_URL}/api/webhook/sink`  
Inspect: `GET /api/webhook/sink` with `x-miai-signature` / `?token=` (shared secret).  
Outbound POSTs use HMAC `x-miai-signature: v1=<hex>` + `x-miai-timestamp` (legacy raw secret still accepted on the sink).  
**Production:** `WEBHOOK_SINK_SECRET` is required (POST + GET). Pass the same value as the Actions shared secret.

In Actions → Webhook: paste URL + secret → Save webhook → Studio **live** chat.

## MCP (customer tool server)

MyInstantAI is the **MCP client**. Point Actions → MCP at a server that implements:

`POST {endpoint}/tools/call` with `{ "name": "<tool>", "arguments": {…} }` and `Authorization: Bearer <token>`.

Self-hosted proof sink: `{APP_BASE_URL}/api/mcp` (inspect: `GET /api/mcp` with Bearer / `?token=`).  
**Production:** `MCP_SINK_TOKEN` is required for POST `/api/mcp/tools/call` and GET inspect.

```bash
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:mcp
```

That remaps `make_guest_request` → `mcp` for the proof, then restores webhook.

## Expand after first slice

```bash
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:live --chat --expand --auto-record
```

Hotel guest, home-services, clinic-front-desk, salon-booking, then flagship expand:
`us-events-venue`, `us-gym-membership`, `us-pharmacy`, `us-accounting-practice`.

### Featured Go-live 18 (Clusters A–C)

Prove (or re-prove) every featured family against Phase-1 OAuth already on staging:

```bash
DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:live --chat --golive18 --auto-record
```

Covers first slice + expand + remaining gaps (`restaurant-takeaway`, `customer-support`, `delivery-tracking`, `trades-receptionist`, `onboarding-buddy`, `building-management`, `pharmacy`). Shopify / carrier TMS remain deferred until those OAuth apps are wired — Slack/HubSpot/Calendar handoffs still earn Depth: live.

After HubSpot: sales-qualifier + IT ticket are recorded. Next optional: Shopify.

**Diligence surface:** live-LLM + connector proof summary → [`/quality`](../apps/web/src/app/quality/page.tsx) (`pnpm scoreboard:live`).

**Staging note:** OAuth can be `configured=true` while `connected=false` (tokens cleared / never re-linked). Re-Connect in Actions before expecting `proof:live --chat` to pass. Prefer **`us-events-venue`** as the next flagship `Depth: live` candidate once Calendar + Slack are connected.