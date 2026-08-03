# Flagship depth close — 2026-08-03

**Brief:** `docs/CURSOR_FLAGSHIP_DEPTH.md`  
**Owner:** Cursor  
**Branch:** `product/flagship-depth-1a`  
**Tests:** `packages/runtime/test/flagship-depth-1a-workflows.test.mjs` (`pnpm --filter @miai/runtime test`)

## Phase 1a status

| Family | Workflow module | Dispatch | Confirm-before-write | Connector via `executeTool` | Unit tests | Pilot depth | `eval:live` |
|---|---|---|---|---|---|---|---|
| `accounting-practice` | `workflows/accounting-practice.ts` | yes | `capture_onboarding` | HubSpot write + Slack handoff | yes | **strong** (sandbox) | see below |
| `events-venue` | `workflows/events-venue.ts` | yes | `book_site_visit` | Google Calendar + Slack | yes | **strong** (sandbox) | see below |
| `building-management` | `workflows/building-management.ts` | yes | `log_maintenance` | Webhook + Slack | yes | **strong** (sandbox) | see below |
| `pharmacy` | `workflows/pharmacy.ts` | yes | `log_refill_request` | Shopify/webhook + Slack | yes | **strong** (sandbox) | see below |
| `gym-membership` | `workflows/gym-membership.ts` | yes | `request_freeze_or_cancel` | Calendar binding + Slack | yes | **strong** (sandbox) | see below |

> Relabeled from `live` → `strong` per Claude verify (`flagship-depth-verify-2026-08-03.md`): sandbox `executeConnector` must not inflate the platform `Depth live` headline metric.

## Shipped per family

1. **accounting-practice** — deadlines/docs reads; propose → confirm → `capture_onboarding` + Slack notify; tax advice / cross-client → handoff.
2. **events-venue** — packages/date reads; propose site visit → confirm → `check_date_availability` + `book_site_visit` + Slack; enquiry path; card/complex → refuse/handoff.
3. **building-management** — levy/access reads; propose → confirm → `log_maintenance` + Slack; burst-pipe/emergency → immediate handoff (no silent ticket).
4. **pharmacy** — stock/script/store reads; propose refill → confirm → `log_refill_request` (explicitly not approval); clinical/emergency → handoff.
5. **gym-membership** — plans/schedule reads; propose freeze/cancel → confirm → `request_freeze_or_cancel` (never “already frozen”); billing/contract → handoff.

## Phase 1b (Cluster B) — report

**Not started in this close.**  
`customer-support`, `delivery-tracking`, `trades-receptionist` remain in the Go-live 18 depth gap **and** protected Cluster B. Per brief: any future work must be **runtime-orchestration-layer only** — no `.agent.json` edits. Boundary honored by skipping 1b entirely this round.

## Phase 3 (partial, unblocked for 1a evidence)

- `scripts/eval-live.mjs` now supports `--families=<comma-list>`, `--set=flagship-1a`, `--set=go-live-18`.
- Public scoreboard page deferred (use dated `docs/reports/eval-live-*.md` from a live-key run).

## Connector evidence (sandbox executeConnector)

Shared stamp `mscqcwrr` (2026-08-03):

| Family | Tool | Result |
|---|---|---|
| accounting-practice | Slack `handoff_to_human` | `routed: true` |
| events-venue | Google Calendar `book_site_visit` | `BK-3391` |
| building-management | webhook `log_maintenance` | `REF-1001` |
| pharmacy | Shopify `check_stock` | `in_stock: true` |
| gym-membership | Google Calendar `request_freeze_or_cancel` | `REF-1001` |

OAuth-connected live proofs still via `pnpm proof:live --chat` when provider keys exist on staging.

## eval:live evidence

Requires `MIAI_MODEL_MODE=anthropic|openai|gateway` + API key (script exits 2 in mock). **Not run in this close environment** (no keys).

```bash
pnpm eval:live --set=flagship-1a
```

Attach the dated `docs/reports/eval-live-*.md` when keys are present — do not equate MockModel suite % with live quality.

## Guardrails honored

- No deletions of unprefixed ZA `data/catalog/*.agent.json`
- No Cluster B catalogue edits
- No dispatch if-chain registry refactor
- No new catalogue families
- Phase 2 not started (awaiting Malcolm industry pick)

## Claude verification ask

See `docs/reports/flagship-depth-verify-2026-08-03.md`. Required pilot-label fix applied (`Depth: strong`).
