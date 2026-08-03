# Flagship depth Phase 1b (Cluster B re-gap) — verification — 2026-08-03

**Verifier:** Claude (independent of Cursor) — 4 adversarial verifiers via Workflow, plus deterministic gates
**Pin SHA:** `a92e385` on `product/flagship-depth-phase1b` (PR #12)
**Base:** `main` at `5262568` (STOP-suppression extraction, PR #11)
**Method:** deterministic gates in an isolated `git worktree` + 4 adversarial verifiers reading source/diff directly, no trust placed in the close note or PR description.

---

## Verdict: **PASS — 4/4 claims FIXED (92–96% confidence), no required fixes**

This closes the flagship-depth push's last open item — the Cluster B gap flagged back in the original brief.

## Gates (isolated worktree, pin `a92e385`)

| Gate | Result |
|---|---|
| `pnpm install` · `build:packages` · `typecheck` | ✅ pass |
| `pnpm test` (root) | ✅ 49 pass, unchanged |
| `pnpm --filter @miai/runtime test` | ✅ **46/46 pass** (39 prior + 7 new — matches the close note exactly; independently re-run, not just counted) |
| `pnpm catalog:integrity` | ✅ 500/100/551/51 — no regression |
| CI required checks (`quality`, `secrets`) | ✅ both pass |
| SonarCloud (non-required) | `new_reliability_rating`: **OK** (the STOP-suppression regex fix holds — no repeat of the earlier issue in the new files). `new_duplicated_lines_density`: fails at 14.2% — same category as prior phases (per-family workflow-module boilerplate), non-blocking. |

## Claim-by-claim verdict

| # | Claim | Verdict | Confidence |
|---|---|---|---:|
| 1 | `trades-receptionist` already covered by `booking-front-desk`, no new module needed | ✅ **FIXED** | 96% |
| 2a | `customer-support` got a real new runtime-only workflow | ✅ **FIXED** | 92% |
| 2b | `delivery-tracking` got a real new runtime-only workflow | ✅ **FIXED** | 96% |
| 3+4+5 | Zero catalogue edits; pilots `Depth: strong` with sandbox-only evidence; 46/46 tests (7 new) | ✅ **FIXED** | 96% |

### 1. `trades-receptionist` re-gap — genuinely true, not a superficial regex match

`isBookingFrontDesk()` (`booking-front-desk.ts:40-42`) matches `salon-booking|trades-receptionist|home-services` and is confirmed to dispatch at `index.ts:2262-2271` with no separate `isTradesReceptionist` gate anywhere in the repo — `booking-front-desk.ts` itself is **not in this PR's diff** (pre-existing code), ruling out a PR that fabricates the claim. More importantly, the shared module's internal logic is genuinely trades-aware (not a coincidental regex overlap): `family = bookingFamily(agentId)` branches on salon vs. trades throughout — gas-leak escalation to 911/112, drain/boiler/AC/rewire service extraction, `request_estimate` for full rewires — matching the exact eval IDs present in `us-trades-receptionist.agent.json` (`gas-emergency-911`, `estimate-rewire`, `cross-customer-refused`). The pilot doc's evidence line accurately describes this as shared-module coverage without overclaiming.

### 2a/2b. Both new workflows are real, dispatched correctly, safety-tested

Both `customer-support.ts` (312 lines) and `delivery-tracking.ts` (311 lines) have real guards, genuine multi-step orchestration (propose → confirm → execute → verify), and dispatch through the exact same shared `executeTool` closure (`index.ts:2131-2141`) every other workflow in the codebase uses. Test assertions are behavioral, not tautological — e.g. a plain order-status query asserts `get_order_status` fires and `create_ticket` does not; a refund-now/card request asserts zero tool calls before confirmation and that `create_ticket` is never called on the refusal path. One verifier went further than static review and **manually invoked `runDeliveryTrackingWorkflow` from the compiled `dist` output**, confirming STOP-suppression and card-refusal both fire correctly at runtime — proving the shared guardrail code is wired, not dead.

### 3+4+5. Guardrails and labeling — clean

`git diff main..a92e385 --stat -- data/catalog/` is empty — zero catalogue files touched, confirmed directly, not inferred. All 3 pilot docs (`customer-support.md`, `delivery-tracking.md`, `trades-receptionist.md`) correctly read `Depth: strong` with sandbox-only evidence and an explicit "promote to `Depth: live` only after OAuth" caveat — **no repeat of the live-vs-strong labeling slip** from Phase 1a. Test count reconciles exactly: 39 pre-existing (10 + 9 + 11 + 9 across the four prior test files, confirmed via `git show main:...`) + 7 new = 46. Full diffstat is 11 files, all in scope — no unrelated bundled changes.

## Minor, non-blocking notes

- The card/CVV refusal message text in `delivery-tracking.ts` is reused verbatim from a payment-context workflow ("settle... via a secure link") and reads slightly oddly for a delivery-tracking agent — functionally correct (refuses card data, zero tool calls), purely cosmetic.
- SonarCloud duplication (14.2%) is the same recurring category as prior phases — per-family workflow-module boilerplate (step/plan interfaces, `isConfirm`, extraction helpers). Not chased further; a real fix would require restructuring the workflow-dispatch pattern itself, which is explicitly out of scope per the standing guardrail against refactoring the dispatch if-chain.

## Regressions

**None found.**

---

## Sign-off

Phase 1b closes the flagship-depth push's original finding cleanly: all 3 Cluster B gap families now have real coverage — 2 via genuine new runtime-only workflows, 1 via a correctly-identified pre-existing shared module — with zero catalogue edits, correct `Depth: strong` labeling, and no regressions. The full flagship-depth arc (audit finding → Phase 1a → verify → fix → Phase 2 target pick → Phase 2 → verify → regex-dedup fast-follow → Phase 1b → verify) is now **fully closed** with no outstanding required items.
