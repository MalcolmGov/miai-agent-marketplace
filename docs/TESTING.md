# Testing & automation framework

Layered automation for the MyInstantAI Agent Marketplace. Prefer fast, deterministic gates on every PR; run staging UI/API smoke against Railway without blocking merges until stable.

## Pyramid

| Layer | Command | Blocks PR? | Notes |
|---|---|---|---|
| **L0 Unit / contract** | `pnpm test`, `pnpm test:runtime`, `pnpm test:api-contract` | Yes (`pnpm run ci`) | wallet, connectors, web, retrieval |
| **L1 Catalogue integrity** | `pnpm catalog:integrity` | Yes | 100 families × 5 markets; ZA ⊂ Africa |
| **L2 Static / mock evals** | `pnpm eval:suite:static` | Yes | routing + guardrails; not live quality |
| **L3 Staging E2E smoke** | `pnpm test:e2e:smoke` / `pnpm smoke:staging` | No (soft) | Playwright `@smoke` vs Railway |
| **L4 Critical-path E2E** | `pnpm test:e2e` | No (nightly / manual) | includes sandbox chat |
| **L5 Live LLM sample** | `pnpm eval:live --limit=N` | No | credit-gated; not CI-required |
| **Deploy HTTP smoke** | `BASE=… pnpm smoke:cutover` | Manual / post-deploy | health + home (+ token path) |

## Playwright (L3–L4)

Specs live under [`e2e/`](../e2e/). Config: [`playwright.config.ts`](../playwright.config.ts).

Default base URL: `https://miaiweb-production.up.railway.app`  
Override: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`.

```bash
pnpm install
pnpm test:e2e:install          # Chromium only
pnpm smoke:staging             # @smoke against Railway
pnpm test:e2e:smoke            # @smoke (uses PLAYWRIGHT_BASE_URL / default)
pnpm test:e2e                  # full suite incl. sandbox chat
```

Mock rails identity for API steps (headers set in Playwright config):

- `x-workspace-id` / `E2E_WORKSPACE_ID` (default `demo-workspace`)
- `x-user-id` / `E2E_USER_ID` (default `e2e-user`)
- `x-roles` / `E2E_ROLES` (default `owner,operator`)

### Spec map

| Spec | Tag | Asserts |
|---|---|---|
| `e2e/api/health.spec.ts` | `@smoke` | `/api/health` not failing; store ping |
| `e2e/api/catalog.spec.ts` | `@smoke` | 500 agents / 5 markets; US ~100 |
| `e2e/api/embed.spec.ts` | `@smoke` | `agent.js` + SRI |
| `e2e/api/app-channel.spec.ts` | `@smoke` | app page + invalid key 401 |
| `e2e/api/rent.spec.ts` | `@smoke` | rent + agent read under mock |
| `e2e/ui/catalogue.spec.ts` | `@smoke` | `#catalogue`, Rent / setup |
| `e2e/ui/agent-studio.spec.ts` | `@smoke` | studio + `?step=try` chat shell |
| `e2e/ui/sandbox-chat.spec.ts` | (full) | send message → response path |

## CI workflows

| Workflow | Role |
|---|---|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Required quality + secrets |
| [`.github/workflows/eval-nightly.yml`](../.github/workflows/eval-nightly.yml) | Nightly mock evals (+ optional live) |
| [`.github/workflows/e2e-staging.yml`](../.github/workflows/e2e-staging.yml) | Non-blocking staging Playwright (`continue-on-error`) |

Optional repo variable: `PLAYWRIGHT_BASE_URL` (defaults to Railway staging).

Promote E2E to a required check only after ~1–2 weeks of green `@smoke` runs.

## Local quality gate

```bash
pnpm run ci          # not bare `pnpm ci` (pnpm reserved)
```

## Related

- Cutover HTTP smoke: `scripts/cutover-smoke.mjs`
- Live LLM (offline runtime, not HTTP): `pnpm smoke:live-llm`
- Railway runbook: [`RAILWAY_DEPLOY.md`](./RAILWAY_DEPLOY.md)
