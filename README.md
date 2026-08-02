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

## CI & automation

PRs and `main` pushes run [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (build, typecheck, lint, tests, static evals). Nightly full evals: [`.github/workflows/eval-nightly.yml`](.github/workflows/eval-nightly.yml). Staging Playwright smoke (non-blocking): [`.github/workflows/e2e-staging.yml`](.github/workflows/e2e-staging.yml). Local gate: `pnpm run ci`.

Full pyramid: [`docs/TESTING.md`](docs/TESTING.md).

## Scripts

Grouped by purpose — full list in root `package.json`.

### Catalog

| Script | Purpose |
|---|---|
| `pnpm import:catalog` | Import agent packages into `data/catalog` |
| `pnpm generate:packs` | Generate missing market-pack variants (idempotent) |
| `pnpm merge:za-africa` | Map legacy ZA unprefixed ids → Africa indexed SKUs |
| `pnpm polish:catalog` | Rich overlays + readiness gate fields |
| `pnpm generate:presets` | Regenerate connector presets for all agents |
| `pnpm catalog:ready` | Readiness check against catalogue gates |
| `pnpm certify:golive` | Go-live certification script |
| `pnpm catalogue:ship` | Polish + presets + build + readiness (ship gate) |
| `pnpm generate:ask-digest` | Regenerate Ask AI marketplace digest |

### Eval

| Script | Purpose |
|---|---|
| `pnpm eval:smoke` | Pilot runtime + injection refusal smoke |
| `pnpm eval:suite` | Full eval suite (mock runtime) |
| `pnpm eval:suite:static` | Static evals only (CI subset) |
| `pnpm eval:full` | Fix evals → suite → heal → re-run suite |
| `pnpm fix:evals` / `pnpm heal:evals` | Catalogue eval repair helpers |

### Proof / smoke

| Script | Purpose |
|---|---|
| `pnpm demo:phase1` | Phase 1 exit-criteria API demo (dev server required) |
| `pnpm proof:live` | Live connector proof |
| `pnpm proof:webhook` / `pnpm proof:mcp` | Webhook / MCP integration proofs |
| `pnpm smoke:cutover` | Cutover smoke checks |
| `pnpm smoke:staging` | Playwright `@smoke` against Railway staging |
| `pnpm uat:staging` | Playwright `@functional` + `@uat` against Railway |
| `pnpm handover:staging` | Full MyInstantAI handover E2E pack (76 scenarios) |
| `pnpm smoke:live-llm` | Live LLM smoke (optional keys) |
| `pnpm smoke:live-llm:matrix` | Live LLM smoke across model matrix |

### CI / test

| Script | Purpose |
|---|---|
| `pnpm run ci` | CI quality gate (build, typecheck, test, static evals) |
| `pnpm test` | Wallet + connectors + web unit tests |
| `pnpm test:unit` / `pnpm test:web` / `pnpm test:wallet` / `pnpm test:runtime` | Subset tests |
| `pnpm test:api-contract` | Web API contract tests |
| `pnpm test:e2e:install` | Install Playwright Chromium |
| `pnpm test:e2e:smoke` / `test:e2e:functional` / `test:e2e:uat` | Staging E2E layers |
| `pnpm test:e2e:acceptance` / `pnpm test:e2e` | Smoke+functional+UAT / full suite |
| `pnpm typecheck` | Typecheck all workspace packages |
| `pnpm build` / `pnpm build:packages` / `pnpm build:web` | Build packages or web app |

### Deploy / ops

| Script | Purpose |
|---|---|
| `pnpm dev` / `pnpm start:web` | Local dev server / production start |
| `pnpm validate:azure` | Azure Bicep validation |
| `pnpm production:status` | Production wave status report |
| `pnpm demo:app` | Mobile shell demo |
| `pnpm pdf:branded` | Generate branded PDF assets |

## Docs

| Doc | Purpose |
|---|---|
| [docs/adr/](docs/adr/) | Architecture decision records |
| [SECURITY.md](SECURITY.md) | Vulnerability reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, catalogue rules, PR gate |
| [docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md) | Staging deploy checklist |
| [docs/TRUST_AND_COMPLIANCE.md](docs/TRUST_AND_COMPLIANCE.md) | Trust & compliance claims |

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
