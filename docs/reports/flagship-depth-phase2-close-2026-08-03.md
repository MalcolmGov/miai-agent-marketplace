# Flagship depth Phase 2 close — 2026-08-03

**Brief:** `docs/CURSOR_FLAGSHIP_DEPTH.md` (Phase 2 — financial services)  
**Owner:** Cursor  
**Branch:** `product/flagship-depth-phase2`  
**Tests:** `packages/runtime/test/flagship-depth-phase2-workflows.test.mjs`

## Status

| Family | Workflow | Dispatch | Confirm-before-write | Unit tests | Pilot depth | Notes |
|---|---|---|---|---|---|---|
| `mobile-money` | `workflows/mobile-money.ts` | yes | cash-in / cash-out / send | yes | **strong** | PIN/OTP refuse; over-cap → handoff |
| `wealth-management` | `workflows/wealth-management.ts` | yes | `capture_wealth_meeting` | yes | **strong** | No investment advice |
| `tax-office` | `workflows/tax-office.ts` | yes | `log_tax_enquiry` | yes | **strong** | No personal tax advice |
| `veterinary` (optional) | `workflows/veterinary.ts` | yes | `book_appointment` | yes | **strong** | Completes health & wellness vertical |

## Labeling discipline

All four pilots remain **`Depth: strong`** with honest sandbox Evidence lines (`corr_flagship_2_*_msctci7e`). **Do not** promote to `live` until real OAuth staging proof or `pnpm eval:live --set=flagship-2` with live model keys.

## Connector evidence (sandbox)

| Family | Tool | Result |
|---|---|---|
| mobile-money | webhook `record_cash_in` | `REF-0001` |
| wealth-management | HubSpot `capture_wealth_meeting` | `APP-4821` |
| tax-office | webhook `log_tax_enquiry` | `REF-1001` |
| veterinary | Google Calendar `book_appointment` | `BK-3391` |

## eval:live

```bash
pnpm eval:live --set=flagship-2
# alias: --set=financial-services
```

Not run in this environment (no live model keys). MockModel suite % is not live quality.

## Guardrails

- No Cluster B catalogue edits
- No ZA pack deletions
- No new catalogue families
- No dispatch if-chain registry refactor
- Phase 1b still not started

## Claude verification ask

Same bar as Phase 1a verify: file:line for each module + dispatch; spot-check pilots are **`Depth: strong`** (not `live`) with Evidence matching sandbox; confirm Cluster B untouched; `pnpm --filter @miai/runtime test` green.
