# Catalogue-ready claim

## Commercial framing (safe to sell)

**55 agent families × US / EU / Africa / Asia market packs (220 agents) are catalogue-production-ready** in this marketplace. Former ZA agents are included in the **Africa** pack (no separate ZA market).

That means every variant:

- Ships as a valid `miai.agent-package/v1` (prompt, knowledge, tools, guardrails, evals)
- Has market compliance, languages, channels, handoff, and prepaid SKUs
- Has a connector preset for Actions
- Passes the automated catalogue readiness gate
- Can complete rent → configure → actions → sandbox in the marketplace

## What this is not

Catalogue-ready is **not** the same as full MyInstantAI platform production:

| Still platform integration | Status |
|---|---|
| Live MIAI wallet API | Adapter-mocked in staging |
| Auth / SSO | Not wired |
| Postgres rental persistence | In-memory today |
| Key Vault | Not yet |

Those do **not** block selling the catalogue SKU list; they are integration work on the MIAI rails.

## How to verify

```bash
pnpm polish:catalog
pnpm generate:presets
pnpm build:packages
pnpm catalog:ready    # must report 271/271 and 55/55
pnpm eval:smoke
```

## Badges in UI

- **Catalogue ready** — family passes the gate across its pack variants
- **Pilot** — explicit Phase-1 demo agents
- **LIVE** — pilot or phase-1 preset path promoted for live demo
