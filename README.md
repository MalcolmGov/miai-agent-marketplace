# MyInstantAI Agent Marketplace

Greenfield **Agents Marketplace + Agent Runtime** for MyInstantAI. Consumes `miai.agent-package/v1` bundles from `miai-agents`, integrates via auth / wallet / model adapters.

## Quick start

```bash
pnpm install
pnpm import:catalog          # from ../miai-agents-audit/agents
pnpm -r --filter './packages/*' build
pnpm --filter @miai/web dev  # http://localhost:3000
```

## Prototype loop

1. Browse catalogue (search, market chips, LIVE/pilot badges)
2. Open e.g. **US Customer Support** → Rent (Standard $349 / Pro $699 / Enterprise $1199)
3. Pick model · paste knowledge · connect Actions (Shopify / Calendar / Slack / …)
4. Copy `agent.js` snippet · sandbox chat · top up tokens
5. Empty wallet → pause banner; top up → resume

## Scripts

| Script | Purpose |
|---|---|
| `pnpm import:catalog` | Import agent packages into `data/catalog` |
| `node scripts/eval-smoke.mjs` | Pilot runtime + injection refusal smoke |
| `node scripts/phase1-demo.mjs` | Phase 1 exit-criteria API demo (dev server required) |

## Layout

```text
apps/web          Next.js marketplace + embed + APIs
apps/runtime      Turn worker scaffold
apps/connectors   OAuth / connector admin scaffold
packages/*        protocol, wallet, connectors, presets, runtime
infra/azure       Bicep baseline
docs/PLATFORM_INTEGRATION.md
```

## Env

| Variable | Default |
|---|---|
| `MIAI_WALLET_MODE` | `mock` |
| `MIAI_WALLET_API_URL` | — (when `http`) |
| `CATALOG_DIR` | `../../data/catalog` (from `apps/web`) |
| `APP_BASE_URL` | OAuth redirect base (`http://localhost:3000`) |

Connector OAuth: copy `apps/web/.env.example` → `.env.local` and see `docs/CONNECTOR_OAUTH.md`.

## Staging on Railway

See **[docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md)** — Dockerfile + `railway.toml` included.

```bash
railway login && railway init && railway up
# then set APP_BASE_URL + OAuth secrets; mount volume at /data
```
