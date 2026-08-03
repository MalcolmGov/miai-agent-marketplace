# Testing & automation framework

Layered automation for the MyInstantAI Agent Marketplace. Prefer fast, deterministic gates on every PR; run staging UI/API smoke, functional, and UAT against Railway without blocking merges until stable.

## Pyramid

| Layer | Command | Blocks PR? | Notes |
|---|---|---|---|
| **L0 Unit / contract** | `pnpm test`, `pnpm test:runtime`, `pnpm test:api-contract` | Yes (`pnpm run ci`) | wallet, connectors, web, retrieval |
| **L1 Catalogue integrity** | `pnpm catalog:integrity` | Yes | 100 families × 5 markets; ZA ⊂ Africa |
| **L2 Static / mock evals** | `pnpm eval:suite:static` | Yes | routing + guardrails; not live quality |
| **L3 Staging E2E smoke** | `pnpm test:e2e:smoke` / `pnpm smoke:staging` | No (soft) | Playwright `@smoke` vs Railway |
| **L4 Functional** | `pnpm test:e2e:functional` | No | feature journeys (`@functional`) |
| **L5 UAT (automated)** | `pnpm test:e2e:uat` / `pnpm uat:staging` | No | partner demo + acceptance bar (`@uat`) |
| **L6 Handover pack** | `pnpm handover:staging` | No | full smoke+functional+UAT+API contracts (76) |
| **L7 UAT (human)** | [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md) | Manual sign-off | diligence / demo readiness |
| **L8 Live LLM sample** | `pnpm eval:live --limit=N` | No | credit-gated; not CI-required |
| **Deploy HTTP smoke** | `BASE=… pnpm smoke:cutover` | Manual / post-deploy | health + home (+ token path) |

Handover evidence pack: [`HANDOVER_TEST_PACK.md`](./HANDOVER_TEST_PACK.md).

## Playwright

Specs live under [`e2e/`](../e2e/). Config: [`playwright.config.ts`](../playwright.config.ts).

Default base URL: `https://miaiweb-production.up.railway.app`  
Override: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000`.

```bash
pnpm install
pnpm test:e2e:install          # Chromium only
pnpm smoke:staging             # @smoke against Railway
pnpm test:e2e:functional       # feature journeys
pnpm test:e2e:uat              # acceptance journeys
pnpm uat:staging               # @functional + @uat against Railway
pnpm handover:staging          # full MyInstantAI handover pack (76)
pnpm test:e2e:acceptance       # smoke + functional + uat
pnpm test:e2e                  # everything under e2e/
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
| `e2e/functional/catalogue-filters.spec.ts` | `@functional` | market, Go-live 100, Learn more |
| `e2e/functional/studio-setup.spec.ts` | `@functional` | knowledge → try → install; configure API |
| `e2e/functional/secondary-pages.spec.ts` | `@functional` | trust / privacy / terms / demo / install / ask |
| `e2e/functional/family-api.spec.ts` | `@functional` | family capability brief |
| `e2e/functional/b2b-onboarding.spec.ts` | `@functional` `@uat` `@handover` | `/get-started` wizard → catalogue checklist; auth handoff |
| `e2e/uat/partner-demo-journey.spec.ts` | `@uat` | browse → rent → chat → install |
| `e2e/uat/acceptance-bar.spec.ts` | `@uat` | B+ ops + 500 SKUs + legal surfaces |

## Functional vs UAT

| Kind | Intent | Audience |
|---|---|---|
| **Functional** | Does each feature work in isolation? | Engineering |
| **UAT (auto)** | Does the buyer journey / acceptance bar hold on staging? | Product + eng |
| **UAT (human)** | Sign-off for partner demo / pilot readiness | Product + partner |

Human checklist: [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md).

## CI workflows

| Workflow | Role |
|---|---|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Required quality + secrets |
| [`.github/workflows/eval-nightly.yml`](../.github/workflows/eval-nightly.yml) | Nightly mock evals (+ optional live) |
| [`.github/workflows/e2e-staging.yml`](../.github/workflows/e2e-staging.yml) | Soft `@smoke` on push; functional+UAT+full on schedule / dispatch |

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
- Pilot bar: [`PILOT_PRODUCTION_BAR.md`](./PILOT_PRODUCTION_BAR.md)
