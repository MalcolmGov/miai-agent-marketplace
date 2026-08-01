# Technical specification — MyInstantAI Agent Marketplace

**Repo:** `miai-agent-marketplace`  
**Date:** 2026-07-31  
**Staging:** `https://miaiweb-production.up.railway.app`  
**Purpose:** Complete technical picture of the build for complexity assessment and competitive copyability analysis.

---

## 1. Executive summary

| Dimension | Scale |
|---|---|
| Platform source LOC (TS/TSX/CSS/scripts/infra) | **~14,500** |
| Agent catalogue JSON (220 packages) | **~102,000** lines / ~2.5M chars of prompt+knowledge |
| Agent families × market packs | **55 × 4 = 220** agents |
| HTTP API route modules | **22** |
| OAuth / API connectors | **16** product connectors (+ webhook templates) |
| Connector presets (tool→connector maps) | **~221** |
| Git commits on `main` (this repo) | **~25** (greenfield delivery, not a multi-year product) |

**Verdict for copyability:** A competitor can clone the *scaffold* (Next.js marketplace + mock wallet) in **2–4 weeks**. Replicating the *catalogue IP*, multi-market packs, OAuth connector surface, embed runtime, and Azure/MIAI adapter contracts is **months of work** plus ongoing content ops — not a weekend clone.

---

## 2. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Customer surfaces                            │
│  Marketplace UI (/)  │  Agent Studio (/agents/:id)  │  Embed JS │
│  Live Ops (/ops)     │  Install (/install)          │  WhatsApp │
└─────────────┬───────────────────────┬───────────────────────────┘
              │                       │
              ▼                       ▼
┌──────────────────────────┐  ┌───────────────────────────────────┐
│  apps/web (Next.js 15)   │  │  Public embed                      │
│  App Router + middleware │  │  /agents/v1/agent.js               │
│  API routes (BFF)        │  │  /api/embed/chat                   │
└─────────────┬────────────┘  └───────────────────────────────────┘
              │
    ┌─────────┼─────────┬──────────────┬────────────────┐
    ▼         ▼         ▼              ▼                ▼
┌────────┐ ┌────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐
│@miai/  │ │@miai/  │ │@miai/      │ │@miai/wallet- │ │ Persistence│
│runtime │ │connect │ │presets     │ │adapter       │ │ Postgres / │
│ models │ │ OAuth  │ │ bindings   │ │ mock│http    │ │ file store │
│ tools  │ │ live   │ │            │ │              │ │ tokens KV  │
└───┬────┘ └───┬────┘ └────────────┘ └──────┬───────┘ └────────────┘
    │          │                             │
    ▼          ▼                             ▼
 OpenAI /   Slack, Google, Calendly,    MyInstantAI wallet API
 MIAI GW    HubSpot, Shopify, …        (when MIAI_WALLET_MODE=http)
```

### Ownership split

| Layer | Owner |
|---|---|
| Agent packages (`miai.agent-package/v1`) | Move Digital |
| Marketplace UI, runtime, connectors, embed | Move Digital (this repo) |
| Auth / SSO, token wallet, model gateway | MyInstantAI (consumed via adapters) |
| Azure landing zone (long-term) | MyInstantAI + Move Digital deploy |

### Runtime modes

| Concern | Env | Values |
|---|---|---|
| Auth | `MIAI_AUTH_MODE` | `mock` \| `oidc` |
| Wallet | `MIAI_WALLET_MODE` | `mock` \| `http` |
| Model | `MIAI_MODEL_MODE` | `mock` \| `openai` \| `gateway` |
| Rentals | `DATABASE_URL` or `RENTAL_STORE_PATH` | Postgres preferred; JSON file fallback |

---

## 3. Repository layout

```
miai-agent-marketplace/
├── apps/web/                 # Next.js marketplace + BFF APIs
├── packages/
│   ├── agent-protocol/       # Package types, rent pricing, category map
│   ├── connectors/           # OAuth + live/stub tool execution
│   ├── presets/              # Tool→connector bindings per agent
│   ├── runtime/              # Agent turn loop, model adapters
│   └── wallet-adapter/       # Mock / HTTP wallet
├── data/catalog/             # 220 *.agent.json + families + index
├── scripts/                  # Catalog polish, packs, presets, evals
├── infra/azure/              # Bicep: CA, Postgres, KV, App Insights
└── docs/                     # Integration, OAuth, migration runbooks
```

---

## 4. Lines of code (measured 2026-07-31)

### Platform source (excluding `node_modules`, `dist`, `.next`)

| Area | LOC | Files |
|---|---:|---:|
| `apps/web/src` | 5,266 | 46 |
| `packages/presets` | 5,223 | 2 |
| `packages/connectors` | 1,647 | 6 |
| `scripts/` | 1,458 | 8 |
| `packages/runtime` | 393 | 1 |
| `infra/` | 273 | 2 |
| `apps/web` CSS | 253 | — |
| `packages/wallet-adapter` | 161 | 1 |
| `packages/agent-protocol` | 108 | 1 |
| **Total platform source** | **~14,540** | **68** |

Breakdown by language: `.ts` ~10.5k · `.tsx` ~2.0k · `.mjs` ~1.5k · `.css` ~0.25k · `.bicep` ~0.25k.

### Catalogue content (the heavy IP)

| Metric | Value |
|---|---:|
| Agent package files | 220 |
| Approx. JSON LOC | ~102,475 |
| Families | 55 |
| Total tool definitions | 936 (~4.3 / agent) |
| Total eval cases | 3,566 (~16.2 / agent) |
| Aggregate `system_prompt` chars | ~1.31M (~6.0k / agent) |
| Aggregate `knowledge` chars | ~1.22M (~5.5k / agent) |
| Docs (markdown) | ~591 LOC |

**Content ≫ code:** catalogue JSON alone is ~7× the platform TypeScript LOC.

---

## 5. Stack & dependencies

### Runtime / framework

- **Next.js 15** (App Router), **React 19**, **TypeScript 5**
- **Tailwind CSS 3**, fonts via `next/font` (Manrope)
- **pnpm** workspaces
- Node **20** Docker image

### Key libraries (`apps/web`)

| Package | Role |
|---|---|
| `jose` | OIDC JWT / JWKS verify |
| `pg` | Postgres rental/audit store |
| `next`, `react`, `react-dom` | UI + BFF |

Workspace packages have **no third-party runtime deps** except cross-references — connectors/runtime use native `fetch` + Node crypto.

### Infra / deploy

- **Railway** staging (`Dockerfile`, `railway.toml`, health `/api/health`)
- **Azure Bicep**: Container Apps, Postgres Flexible Server, Key Vault, Log Analytics, App Insights, MI → KV role

---

## 6. HTTP API surface

Base path relative to app origin.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness / mode report |
| GET | `/api/catalog` | Public | Families / agents catalogue |
| GET | `/api/agents/[id]` | Mock/OIDC | Package + rental + connectors |
| POST | `/api/rent` | Mock/OIDC | Create entitlement |
| POST | `/api/configure` | Mock/OIDC | Model / knowledge / bindings |
| POST | `/api/chat` | Mock/OIDC | Sandbox/live agent turn |
| GET/POST | `/api/wallet` | Mock/OIDC | Balance / top-up |
| GET | `/api/ops` | Mock/OIDC | Ops summary |
| GET | `/api/audit` | Mock/OIDC | Audit events |
| GET/POST | `/api/connectors` | Mixed | List / soft-connect |
| POST | `/api/connectors/credentials` | Mock/OIDC | API-key connectors |
| GET | `/api/oauth/status` | Mock/OIDC | Configured + connected map |
| GET | `/api/oauth/[connector]/start` | Mock/OIDC | Begin OAuth |
| GET | `/api/oauth/callback` | Public | OAuth code exchange |
| POST | `/api/oauth/[connector]/disconnect` | Mock/OIDC | Revoke connector |
| GET/POST | `/api/slack/channels` | Mock/OIDC | Handoff channel picker |
| GET | `/api/knowledge` | Mock/OIDC | List knowledge sources |
| POST | `/api/knowledge/paste` | Mock/OIDC | Paste ingest |
| POST | `/api/knowledge/upload` | Mock/OIDC | File ingest |
| POST | `/api/knowledge/crawl` | Mock/OIDC | Website crawl |
| DELETE | `/api/knowledge/[id]` | Mock/OIDC | Delete source |
| POST | `/api/embed/chat` | Embed key | Public widget chat |

### UI routes

| Path | Role |
|---|---|
| `/` | Marketplace catalogue |
| `/agents/[id]` | Agent Studio (configure / actions / knowledge / chat) |
| `/ops` | Live ops dashboard |
| `/install` | Embed install instructions |
| `/agents/v1/agent.js` | Embeddable widget script |

---

## 7. Packages (internal SDK)

### `@miai/agent-protocol`
- Types: `AgentPackage`, `AgentManifest`, `AgentTool`
- Format id: `miai.agent-package/v1`
- Rent bands USD/EUR by tier
- `marketplaceCategory()` mapping

### `@miai/runtime`
- Agent turn orchestration (tools ↔ connectors ↔ model)
- Model adapters: `MockModelAdapter`, `OpenAIModelAdapter`, `GatewayModelAdapter`
- Debits wallet per turn; pauses on zero tokens

### `@miai/wallet-adapter`
- `MockWalletAdapter` / `HttpWalletAdapter`
- Balance, debit (idempotent), top-up

### `@miai/connectors`
- Connector registry (phase 1 / 2)
- OAuth: signed state, PKCE where required, token seal/store, refresh
- `executeLive` implementations: Slack, Google Calendar, M365, Email, Shopify, HubSpot, Teams, Zendesk, Calendly, Xero, QuickBooks, WhatsApp, Stripe, WooCommerce, webhook, MCP
- Sandbox always returns stubs

### `@miai/presets`
- Per-agent `ToolBinding[]` (tool name → connector)
- ~221 generated presets + hand-tuned pilots

---

## 8. Integrations

### OAuth connectors (11)

| Connector | Env vars | Live API status (code) | Staging (typical) |
|---|---|---|---|
| Slack | `SLACK_OAUTH_*` | Full (post + channel picker) | Connected |
| Google Calendar | `GOOGLE_OAUTH_*` | freeBusy + events | Connected |
| Email (Gmail/MS) | Google or Microsoft | Gmail send / Graph sendMail | Gmail connected |
| Calendly | `CALENDLY_OAUTH_*` | users/me + scheduling URL | Connected |
| M365 Calendar | `MICROSOFT_OAUTH_*` | Graph calendar | Env missing |
| Teams | Microsoft | Graph channel message | Env missing |
| Shopify | `SHOPIFY_OAUTH_*` | Orders lookup | Env missing |
| HubSpot | `HUBSPOT_OAUTH_*` | Contacts / tickets | Env missing |
| Xero | `XERO_OAUTH_*` | Invoices list | Env missing |
| QuickBooks | `QUICKBOOKS_OAUTH_*` | Invoice query | Env missing |
| Zendesk | `ZENDESK_OAUTH_*` | Create ticket | Env missing |

Shared callback: `{APP_BASE_URL}/api/oauth/callback`  
OAuth `state` is HMAC-signed (multi-instance safe).

### API-key / form connectors

Webhook, MCP, WhatsApp Cloud API, WooCommerce, Stripe — credentials via Actions UI → sealed token store.

### MyInstantAI rails (adapters ready, live creds pending)

- OIDC (`jose` + JWKS)
- Wallet HTTP
- Model gateway (OpenAI-compatible)

---

## 9. Agent catalogue & JSON structure

### Scale

| | Count |
|---|---:|
| Families | 55 |
| Markets | us, eu, africa, asia |
| Agents | 220 (55×4) |
| Catalogue-ready gate | 220/220 (commercial bar) |

### Package file naming

`data/catalog/{agentId}.agent.json`  
Examples: `us-customer-support.agent.json`, `africa-dental-front-desk.agent.json`, `accounting-practice.agent.json` (Africa unprefixed legacy ids).

### Family index (`families.json`)

```json
{
  "id": "accounting-practice",
  "name": "Accounting Practice",
  "tier": "pro",
  "category": "vertical",
  "summary": "...",
  "channels": ["whatsapp", "web", "app"],
  "markets": {
    "africa": "accounting-practice",
    "asia": "asia-accounting-practice",
    "eu": "eu-accounting-practice",
    "us": "us-accounting-practice"
  },
  "packs": ["us", "eu", "africa", "asia"],
  "catalogueReady": true
}
```

### Agent package schema (`miai.agent-package/v1`)

```json
{
  "format": "miai.agent-package/v1",
  "manifest": {
    "id": "string",
    "name": "string",
    "version": "1.0.0",
    "category": "front-office|sales|commerce|operations|vertical",
    "tier": "standard|pro|enterprise",
    "summary": "string",
    "channels": ["web", "whatsapp", "app"],
    "languages": ["en", "..."],
    "market": "us|eu|africa|asia",
    "compliance": ["string"],
    "voice": { "enabled": false, "tts": "...", "stt": "..." },
    "model": {
      "primary": "claude-sonnet",
      "fallback": "gpt-4o-mini",
      "temperature": 0.3,
      "max_output_tokens": 1024
    },
    "prompt": "system_prompt.md",
    "knowledge": "knowledge.md",
    "tools": "tools.json",
    "guardrails": "guardrails.md",
    "evals": "evals.json",
    "handoff": { "enabled": true, "target": "human", "triggers": [] },
    "usage_profile": { "tier_cap_msgs_month": 0, "avg_tokens_per_msg": 0 },
    "prepaid": { "skus": [{ "sku": "...", "label": "...", "capacity": "...", "price_band": "..." }] }
  },
  "system_prompt": "long markdown string",
  "knowledge": "long markdown string",
  "tools": [
    {
      "name": "book_appointment",
      "description": "...",
      "parameters": { "type": "object", "properties": {}, "required": [] },
      "returns": "...",
      "side_effects": "write",
      "auth_scope": "calendar"
    }
  ],
  "guardrails": "long markdown string",
  "evals": [
    {
      "id": "...",
      "channel": "web",
      "lang": "en",
      "input": "user utterance",
      "expect": { "tool": "optional_tool", "says_any": [], "says_none": [] }
    }
  ]
}
```

### Tier distribution (220 agents)

| Tier | Count |
|---|---:|
| standard | 58 |
| pro | 131 |
| enterprise | 31 |

### Commercial rent bands (protocol)

| Tier | USD / mo | EUR / mo |
|---|---:|---:|
| standard | 349 | 319 |
| pro | 699 | 649 |
| enterprise | 1199 | 1099 |

---

## 10. Product loop (implemented)

1. **Browse** catalogue (families + market packs)  
2. **Rent** → workspace entitlement  
3. **Configure** model + knowledge  
4. **Actions** → OAuth / API-key connectors  
5. **Knowledge** paste / upload / crawl  
6. **Sandbox / live chat** with tool calls  
7. **Embed** snippet (`agent.js` + public key)  
8. **Wallet** debit / top-up / pause-on-zero  
9. **Ops** audit + rental summary  

---

## 11. Persistence & security

| Store | Mechanism |
|---|---|
| Rentals + audit | Postgres (`miai_rentals`, `miai_audit`) or `rentals.json` (audit cap 5k) |
| OAuth tokens | **AES-256-GCM** (`v2.`) in `oauth-tokens.json`; legacy `v1.` HMAC seals still readable and re-encrypted on persist |
| Knowledge sources | File store under `KNOWLEDGE_STORE_PATH` |
| OAuth state | Self-contained HMAC signature (no server session required) |
| Embed keys | Deterministic HMAC (`mia_pk_…`) — embed chat requires live/rented agent + rate limit |
| Secrets | Env / Railway / Azure Key Vault (bicep mirrors); set `OAUTH_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, `EMBED_KEY_SECRET` |

Auth middleware: Bearer required on `/api/*` when `MIAI_AUTH_MODE=oidc` (public: health, catalog, oauth callback, embed).

RBAC: workspace roles `owner|admin|agent|readonly` on mutating APIs; `/api/admin` requires platform `operator` (mock owners allowed for demos). `/api/audit` and `/api/dsar/export` are workspace-scoped.

Security headers: enforcing `Content-Security-Policy` plus nosniff / referrer / frame / permissions (`apps/web/next.config.ts`).

Trust Center: `/trust` + `docs/TRUST_AND_COMPLIANCE.md` — market-pack compliance vs platform certification claims.

Telemetry: structured console + optional App Insights custom events (`miai.audit.*`).

---

## 12. Build / quality toolchain

| Script | Purpose |
|---|---|
| `pnpm build:packages` | Compile workspace packages |
| `pnpm catalog:ready` | Catalogue-ready gate |
| `pnpm polish:catalog` | Content polish pass |
| `pnpm generate:packs` | Market pack generation |
| `pnpm generate:presets` | Preset generation |
| `pnpm eval:smoke` | Smoke evals across sample agents |
| `pnpm catalogue:ship` | Polish → presets → build → ready |

---

## 13. Complexity & competitive copyability

### What is easy to copy (weeks)

- Dark SaaS marketplace UI shell  
- Mock rent → chat loop with stubs  
- Single-connector OAuth happy path  
- Basic embed iframe/script  

**Estimate for a competent team:** 2–4 weeks to a *lookalike demo* with a handful of agents.

### What is hard to copy (months)

| Asset | Why it’s sticky |
|---|---|
| **220 market-localized packages** | ~2.5M chars prompts/knowledge + 3.5k evals + compliance/prepaid SKUs |
| **55-family × 4-pack commercial matrix** | Product taxonomy + readiness gates, not just translations |
| **Connector surface** | 11 OAuth providers + live tool adapters + sealed tokens + PKCE/state |
| **Runtime economics** | Wallet debit, pause-on-zero, model gateway adapters |
| **Ops path to Azure** | Bicep, migration runbooks, OIDC/wallet/gateway contracts |
| **Domain know-how** | Vertical prompts (dental, insurance, accounting, …) and guardrails |

**Estimate to parity:** 3–6+ months for a team that also rebuilds content quality — or longer if they lack vertical specialists.

### Moat assessment

| Moat type | Strength | Notes |
|---|---|---|
| Codebase uniqueness | **Low–medium** | Next.js + adapters is a known pattern |
| Catalogue / content IP | **High** | Primary differentiator |
| Integration completeness | **Medium–high** | Rising as OAuth apps go live |
| Distribution / MIAI rails | **High (once wired)** | Wallet + SSO + Azure tenancy |
| Time-to-clone lookalike | **Fast** | UI + mock chat |
| Time-to-clone sellable product | **Slow** | Catalogue + connectors + rails |

### Honest positioning

- This is a **focused greenfield product** (~14.5k platform LOC, ~25 commits), not a decade-old monolith.  
- Complexity is **concentrated in content + integrations**, not exotic algorithms.  
- A competitor cloning only the GitHub UI **does not** get your agents, evals, OAuth apps, or MyInstantAI commercial embedding.  
- Defensibility increases with: live customer connectors, verified Google/Microsoft apps, Azure production cutover, and continuous catalogue refresh.

---

## 14. Current staging integration snapshot

*(Verified via `/api/oauth/status` around 2026-07-31)*

**Connected:** Slack, Google Calendar, Email (Gmail), Calendly  
**Ready (env present):** —  
**Need credentials:** HubSpot, Microsoft*, Shopify, Xero, QuickBooks, Zendesk, Teams  

\*Microsoft blocked on tenant signup for personal accounts; not a code gap.

---

## 15. Related docs

- [PLATFORM_INTEGRATION.md](./PLATFORM_INTEGRATION.md) — MIAI API contract  
- [CONNECTOR_OAUTH.md](./CONNECTOR_OAUTH.md) — OAuth setup  
- [MARKET_PACKS.md](./MARKET_PACKS.md) — Family / pack model  
- [CATALOGUE_READY.md](./CATALOGUE_READY.md) — Readiness gate  
- [MIGRATION_P0.md](./MIGRATION_P0.md) / [MIGRATION_P1.md](./MIGRATION_P1.md) / [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md)  
- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)  

---

*Generated from repository measurements on 2026-07-31. Re-run LOC/catalog counts after major catalogue changes.*
