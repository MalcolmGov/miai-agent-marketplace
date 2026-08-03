# Flagship depth Phase 1b close — 2026-08-03

**Brief:** `docs/CURSOR_FLAGSHIP_DEPTH.md` (Phase 1b — Cluster B runtime-only)  
**Owner:** Cursor  
**Branch:** `product/flagship-depth-phase1b`  
**Tests:** `packages/runtime/test/flagship-depth-phase1b-workflows.test.mjs`

## Re-gap finding

| Family | Prior assumption | Actual | Action |
|---|---|---|---|
| `trades-receptionist` | Missing workflow | Already matched by `isBookingFrontDesk` in `booking-front-desk.ts` | Documented; sandbox corr on shared path |
| `customer-support` | Missing workflow | Confirmed missing | New runtime module + dispatch + tests |
| `delivery-tracking` | Missing workflow | Confirmed missing | New runtime module + dispatch + tests |

## Shipped

| Family | Workflow | Confirm-before-write | Safety | Pilot depth |
|---|---|---|---|---|
| `customer-support` | `workflows/customer-support.ts` | `create_ticket` | No self-refund / card refuse | **strong** |
| `delivery-tracking` | `workflows/delivery-tracking.ts` | `log_exception` | Lost/damaged → desk handoff | **strong** |
| `trades-receptionist` | (existing) `booking-front-desk.ts` | `book_appointment` | Gas/emergency → 911 + handoff | **strong** |

## Labeling

All three pilots: **`Depth: strong`** + sandbox Evidence (`corr_flagship_1b_*_mscuy561`). Explicit “promote to live only after OAuth / `pnpm eval:live --set=flagship-1b`”.

## Guardrails

- **Cluster B `.agent.json`:** untouched (runtime-only)
- No ZA pack deletions
- No new catalogue families
- Uses shared `handleStopSuppression` (no duplicated STOP regex)

## Claude verification ask

1. Diff `data/catalog/` empty for Cluster B packs vs `main`
2. File:line for new modules + `index.ts` dispatch
3. Confirm pilots say `Depth: strong` not `live`
4. Confirm `isBookingFrontDesk("us-trades-receptionist") === true`
5. `pnpm --filter @miai/runtime test` green
