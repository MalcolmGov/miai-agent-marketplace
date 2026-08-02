# Catalogue-ready claim

## Commercial framing (safe to sell)

**100 agent families × US / EU / Africa / Asia / Oceania market packs (500 agents) are catalogue-production-ready** in this marketplace. Former ZA agents are included in the **Africa** pack (no separate ZA market). North-star target met — see `FAMILIES_100.md`.

That means every variant:

- Ships as a valid `miai.agent-package/v1` (prompt, knowledge, tools, guardrails, evals)
- Has market compliance, languages, channels, handoff, and prepaid SKUs
- Has a connector preset for Actions
- Passes the automated catalogue readiness gate
- Can complete rent → configure → actions → sandbox in the marketplace

## What this is not

Catalogue-ready is **not** the same as full MyInstantAI platform production. Platform rails are **adapter-ready** in-repo; live credentials are the remaining gate:

| Platform rail | Move Digital status | Blocked on MyInstantAI |
|---|---|---|
| Auth / SSO | OIDC adapter + middleware (`MIAI_AUTH_MODE=oidc`) | Issuer, audience, sample JWT |
| Wallet | HTTP adapter + pause-on-402 (`MIAI_WALLET_MODE=http`) | Base URL, API key, debit contract |
| Model gateway | Gateway adapter (`MIAI_MODEL_MODE=gateway`) | URL, key, alias map |
| Postgres rentals | Wired via `DATABASE_URL` (file fallback) | Azure Postgres from Bicep deploy |
| Key Vault / Azure | Bicep: CA, Postgres, KV, Files, App Insights | Subscription + who runs `az deployment` |

Those do **not** block selling the catalogue SKU list; they are Week-1 integration once staging credentials land. See `MIGRATION_P0.md` / `MIGRATION_RUNBOOK.md`.

## How to verify

```bash
pnpm polish:catalog
pnpm generate:presets
pnpm build:packages
pnpm catalog:ready    # must report 271/271 and 100/100 go-live filter
pnpm eval:smoke
pnpm eval:suite       # full catalogue — expect 100% runtime (3848/3848)
pnpm test:wallet
pnpm validate:azure   # requires az or bicep CLI
# App channel: Studio → Install → App, or open /app/v1?key=… (see docs/APP_CHANNEL.md)
```

## Badges in UI

- **Catalogue ready** — family passes the gate across its pack variants
- Staging UI: **Go-live 100** filter = stand-behind production families (not a limited SKU); featured demos = Go-live 18
