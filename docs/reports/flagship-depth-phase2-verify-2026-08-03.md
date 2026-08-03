# Flagship depth Phase 2 (financial services) — verification — 2026-08-03

**Verifier:** Claude (independent of Cursor)
**Pin SHA:** `b59522f` on `product/flagship-depth-phase2` (PR #9, merged `7d57c79`)
**Base:** `main` at `4a0f2f6` (Phase 2 target confirmation, PR #8)
**Method:** direct source/diff inspection + gates run in an isolated `git worktree`, per `docs/CURSOR_FLAGSHIP_DEPTH.md`'s Phase 2 verification ask (same bar as Phase 1a).

---

## Verdict: **PASS — merged clean, no required fixes**

Unlike Phase 1a, this round shipped with the labeling discipline already correct and no scope creep. Everything below was independently confirmed from source, not taken from the close note.

---

## Acceptance-bar check, per family

| Family | Workflow module | Dispatch | Real safety behavior tested | `Depth:` label |
|---|---|---|---|---|
| `mobile-money` | ✅ 314 lines | ✅ `index.ts:2415` | ✅ **PIN message → zero tool calls** (never processed/logged); **over-cap transfer → `handoff_to_human`, explicitly not `send_money`** | ✅ `strong` |
| `wealth-management` | ✅ 332 lines | ✅ `index.ts:2429` | ✅ investment-advice question → all calls `handoff_to_human`, not `capture_wealth_meeting` | ✅ `strong` |
| `tax-office` | ✅ 332 lines | ✅ `index.ts:2443` | ✅ personal-tax-liability question → `handoff_to_human` fires, `log_tax_enquiry` does not | ✅ `strong` |
| `veterinary` (optional) | ✅ 374 lines | ✅ `index.ts:2457` | tested (not spot-checked line-by-line; module + dispatch confirmed) | ✅ `strong` |

All 4 dispatch through the same shared `executeTool` closure (`index.ts` — confirmed present in each dispatch block) that the 9 pre-existing hero workflows and the 5 Phase 1a workflows use.

**Labeling discipline — the exact issue flagged on Phase 1a — confirmed fixed this round.** All 4 pilot docs read `Depth: strong` with an Evidence line that now explicitly states *"promote to Depth: live only after OAuth/`pnpm eval:live --set=flagship-2`"* — stronger wording than Phase 1a's. Verified byte-for-byte, not trusted from the close note.

**Test quality:** the mobile-money PIN test is the standout — asserting `calls.length === 0` on a message containing a PIN proves the workflow never forwards, logs, or processes it anywhere, which is the correct behavior for a financial agent (never persist/transmit a PIN in chat). The over-cap and advice-refusal tests all assert the *absence* of the write-tool call alongside the *presence* of `handoff_to_human`, not just that "something happened" — genuine behavioral assertions.

---

## Gates (isolated worktree, pin `b59522f`)

| Gate | Result |
|---|---|
| `pnpm install` · `build:packages` · `typecheck` | ✅ pass |
| `pnpm test` (root) | ✅ 75 pass (wallet 5 · connectors 21 · web 49 — unchanged) |
| `pnpm --filter @miai/runtime test` | ✅ **30/30 pass** (9 new Phase 2 + 21 prior = 30, matches close note exactly) |
| `pnpm catalog:integrity` | ✅ 500/100/551/51 — no regression |
| `eval-live.mjs --set=flagship-2` / `--set=financial-services` | ✅ both aliases wired and confirmed in source |

## CI (PR #9)

- **Required checks** (`quality`, `secrets`): ✅ both pass.
- **SonarCloud** (not required): fails on `new_reliability_rating` + `new_duplicated_lines_density` (27.6%). Checked the underlying findings, not just the gate color: **4 MAJOR "regex precedence" issues, one per new file** — the same `^\s*stop\b|unsubscribe|don't (text|message) me` opt-out-suppression pattern from Phase 1a, now duplicated a second time. In the STOP-suppression heuristic, not the confirm-before-write execution path. Non-blocking, same conclusion as Phase 1a — but now present in **9 files total** across both phases, which is a real case for extracting it into one shared helper as a fast-follow (reduces both the duplication flag and the regex-clarity flag in one fix).

## Guardrail compliance

- ✅ **Cluster B untouched**: diffed all 30 files directly against `main` — byte-identical.
- ✅ **No new catalogue families**: zero `data/catalog/*` changes in the diff.
- ✅ **No dispatch if-chain refactor**: additive blocks only.
- ✅ **No ZA pack deletions.**
- ✅ **Scope hygiene improved**: unlike Phase 1a, no unrelated files bundled into this PR — clean, reviewable diff (13 files, all Phase-2-relevant).

---

## Recommendation

No fixes required — already merged. One fast-follow worth scheduling (non-urgent): extract the STOP-suppression regex into a shared `packages/runtime/src/workflows/*` helper, now duplicated across 9 workflow files, to clear the recurring SonarCloud duplication/reliability flags in one pass rather than per-family.
