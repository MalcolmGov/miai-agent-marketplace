# Flagship depth Phase 1a — verification — 2026-08-03

**Verifier:** Claude (independent of Cursor)
**Pin SHA:** `086c060` on `product/flagship-depth-1a` (PR #7, open at verification time)
**Base:** `main` (`56690d6` at PR cut)
**Method:** direct source/diff inspection + gates run in an isolated `git worktree`, per `docs/CURSOR_FLAGSHIP_DEPTH.md`'s own verification ask.

---

## Verdict: **APPROVE with one required fix before merge**

Substantively excellent work — real multi-step orchestration, correctly wired dispatch, genuine safety-behavior tests, and the Cluster B guardrail honored to the byte. One precise labeling issue needs a mechanical fix before merge (5-line change), because it silently affects a platform metric. One hygiene observation, not blocking.

---

## Acceptance-bar check, per family (`docs/CURSOR_FLAGSHIP_DEPTH.md` Phase 1a bar)

| Family | Workflow module | Dispatch wired | Real safety behavior tested | Live-capable `executeTool` | Pilot doc |
|---|---|---|---|---|---|
| `accounting-practice` | ✅ 349 lines | ✅ `index.ts:2337` | ✅ tax-advice → handoff, not capture | ✅ | ⚠️ label |
| `events-venue` | ✅ 393 lines | ✅ `index.ts:2351` | ✅ propose → confirm → book | ✅ | ⚠️ label |
| `building-management` | ✅ 358 lines | ✅ `index.ts:2365` | ✅ **burst-pipe emergency → `handoff_to_human`, explicitly NOT `log_maintenance`** | ✅ | ⚠️ label |
| `pharmacy` | ✅ 358 lines | ✅ `index.ts:2379` | ✅ **dosage question → handoff, not a guess** | ✅ | ⚠️ label |
| `gym-membership` | ✅ 324 lines | ✅ `index.ts:2393` | ✅ freeze/cancel logged only after confirm | ✅ | ⚠️ label |

All 5 dispatch through the **same shared `executeTool` closure** (`index.ts:2116`, wrapping the real `executeConnector`) that the 9 pre-existing hero workflows use — confirmed by reading the dispatch block directly (`index.ts:2337-2404`), not inferred. This is genuinely production-capable code, not a stub-only path.

**Test quality, spot-checked** (`packages/runtime/test/flagship-depth-1a-workflows.test.mjs`): assertions are real behavioral checks, not tautological — e.g. the building-management emergency test explicitly asserts `handoff_to_human` fires **and** `log_maintenance` does **not**, proving the emergency doesn't silently degrade to a logged ticket. 10 new tests (id-guards + 5 families), combined with 11 pre-existing embeddings tests = 21/21 as the close note reported (that total conflates new-with-existing; worth noting for precision, not a defect).

---

## ⚠️ Required fix: `Depth: live` label doesn't match this platform's own evidentiary bar

All 5 new pilot docs (`docs/pilots/{family}.md`) declare `- Depth: live`, with an Evidence line that **honestly discloses** it's sandbox-only: *"sandbox `executeConnector` ... OAuth live + `pnpm eval:live` ... when keys present."* Cursor was transparent about this in the evidence text — that's good practice, and exactly the honesty this whole engagement has pushed for.

The problem is the **label itself**, not the disclosure. The platform's own scoring script (`scripts/production-wave-status.mjs:28`, mirrored in `scripts/certify-golive.mjs:58`) does a **pure regex text match** on `^- Depth:\s*live\b` — it never reads the Evidence line, so it cannot distinguish a real staging OAuth call (e.g. `dental-front-desk.md`: *"Evidence: `corr_wave4_msb98gpj` — live `google_calendar` on https://miaiweb-production.up.railway.app"*) from a sandbox stub. As written, these 5 docs will silently count toward the **`Depth live`** headline metric (`production:status` currently reports `8/100`) even though none have real live-connector proof yet.

**Why this matters:** this metric was explicitly the trust asset my brief's Phase 3 was counting on ("a live, honest quality benchmark... turns the audit's own honesty into a trust story"). Diluting it with sandbox-backed entries is the same class of issue the original technical audit flagged about eval pass-rates ("teaching to the test") — low severity today (confirmed: `certify-golive.mjs:85` explicitly treats `strong`/`live` as equal for the pass/fail commercial gate — *"live is stretch, not blocker for cert"* — so this does **not** threaten the Go-live 100 certification), but real for metric integrity.

**Fix:** relabel all 5 to `- Depth: strong` (the existing convention for "built + evidenced, not yet live-OAuth-proven" — matches the format already used elsewhere in `docs/pilots/*.md`). Keep the Evidence line as-is (it's honest and useful). Promote to `Depth: live` once a real `pnpm eval:live --set=flagship-1a` or `pnpm proof:live` run against a rented+live workspace produces a genuine staging correlation id, same bar as the other 8.

```bash
sed -i '' 's/^- Depth: live$/- Depth: strong/' docs/pilots/{accounting-practice,events-venue,building-management,pharmacy,gym-membership}.md
```

---

## Observation (not blocking): PR bundles unrelated changes

The diff against `main` also touches `apps/web/src/app/login/page.tsx`, `apps/web/src/app/marketing/page.tsx`, `apps/web/src/components/GetStartedWizard.tsx`, `docs/B2B_ONBOARDING.md`, `e2e/functional/b2b-onboarding.spec.ts` — onboarding/login work unrelated to the flagship-depth brief, likely carried along from how the branch was cut. Not a guardrail violation, but worth splitting into its own PR for cleaner review/blame history going forward.

---

## Gates (isolated worktree, pin `086c060`)

| Gate | Result |
|---|---|
| `pnpm install` · `build:packages` · `typecheck` | ✅ pass |
| `pnpm test` (root) | ✅ 75 pass (wallet 5 · connectors 21 · web 49 — unchanged, root script doesn't include `@miai/runtime`) |
| `pnpm --filter @miai/runtime test` | ✅ **21/21 pass** (10 new flagship + 11 pre-existing) |
| `pnpm catalog:integrity` | ✅ 500/100/551/51 — **no regression** |

## Guardrail compliance

- ✅ **Cluster B untouched**: all 30 files (`customer-support`/`delivery-tracking`/`trades-receptionist` × 5 markets) byte-identical to `main` — diffed directly, not trusted from the close note.
- ✅ **Phase 1b correctly not started** — no workflow files created for the 3 Cluster-B-overlapping families.
- ✅ **No new catalogue families** — 0 `data/catalog/*` files in the diff.
- ✅ **No dispatch if-chain refactor** — additive `if (isX(...))` blocks only, matching the existing 9.
- ✅ **No ZA pack deletions.**

---

## Recommendation

Fix the 5-line label issue (mechanical, ~1 minute), then merge. Everything else meets or exceeds the Phase 1a acceptance bar. Once the live-eval/OAuth proof lands for these 5 (whenever keys are available), promote the label to `live` for real and this phase is fully closed — no further code changes needed.
