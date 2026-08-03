# Cursor task — flagship depth push (Go-live 18 gap ✅ done → financial services now)

**Owner:** Cursor
**Context:** the platform's own featured showcase (`GO_LIVE_18_FAMILY_IDS` in `apps/web/src/lib/monday-pilot.ts`) is what prospects see first. Cross-referencing it against real depth investment (a `packages/runtime/src/workflows/*.ts` state machine + a `Depth: live` pilot doc) shows **10 of the 18 have it, 8 don't** — and 6 of those 8 are `pro` tier, i.e. already sold at premium pricing while running the shallow single-tool-round path the earlier audit flagged (`docs/reports/technical-audit-2026-08-02.md` §6, AI Platform). This brief closes that gap, then extends the same bar to a couple of enterprise-tier verticals, then makes it a public trust asset.

**Goal:** more agents at hero quality in your *own* showcase and highest-value tier — not more agents in the catalogue. Do not add new families.

---

## Guardrails (do not violate)

- **Never delete unprefixed `data/catalog/*.agent.json`** — ZA market packs, not orphans.
- **⚠️ Cluster B conflict — read before Phase 1b.** `customer-support`, `delivery-tracking`, `trades-receptionist` are simultaneously (a) in the Go-live 18 gap list below, AND (b) in the protected Cluster B set (`restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist`) that Claude hand-deepened earlier and that scripts hard-skip. **Do not re-run any catalogue-deepening script or hand-edit their `.agent.json` knowledge/evals/guardrails.** If you pursue depth on these three, it must be **runtime-orchestration-layer only** — a new `packages/runtime/src/workflows/*.ts` module + dispatch wiring in `runtime/index.ts`, reading their *existing* knowledge/tools unchanged. If that boundary is unclear for any of the three, skip it and flag back rather than guess.
- **MockModel eval pass-rate is not live-LLM quality.** Every "Depth: live" claim in this push must be backed by a `pnpm eval:live` run, not the static/mock suite.
- Keep the CI gate green (`pnpm run ci`). Add unit test coverage with each new workflow module (repo convention; `dental-front-desk.ts` / `hotel-guest.ts` have no dedicated test files today — cover the new ones instead of matching that gap).
- Phase 2 target industry is now **confirmed by Malcolm** (see Phase 2 section — financial services). Do not substitute a different industry without checking back.
- Surgical, additive changes. Don't refactor the existing hardcoded workflow-dispatch if-chain in `runtime/index.ts` as part of this — that's a separate architecture item (noted in the audit, not in scope here).

---

## Phase 1a — Close the depth gap (5 agents, no guardrail conflict) — ✅ DONE

Shipped in PR #7 (merged `585ac92`), independently verified: `docs/reports/flagship-depth-verify-2026-08-03.md`. All 5 pilot docs correctly carry `Depth: strong` (not `live` — no real OAuth staging proof yet; promote once `pnpm eval:live --set=flagship-1a` or `pnpm proof:live` produces a genuine correlation id). Original brief kept below for reference.

Target families and their current state (all already have solid catalogue content — 4-6 tools, 14-18 evals each — so this is orchestration work, not knowledge-authoring from scratch):

| Family | Tier | Tools | Evals |
|---|---|---:|---:|
| `accounting-practice` | pro | 4 | 16 |
| `events-venue` | pro | 5 | 17 |
| `building-management` | pro | 4 | 14 |
| `pharmacy` | pro | 5 | 17 |
| `gym-membership` | standard | 4 | 17 |

**Per-agent acceptance bar** (the thing that separates your 10 real heroes from the rest — model each on `packages/runtime/src/workflows/dental-front-desk.ts`, 493 lines, the clearest reference: `isX(agentId)` guard, a `WorkflowStep`/`WorkflowPlan` interface with `pending/done/skipped/failed` status, `list → check availability/eligibility → confirm → execute → notify → verify` steps, explicit confirm-before-write parsing):

1. A workflow module under `packages/runtime/src/workflows/{family}.ts` implementing real multi-step orchestration (not the generic single-tool-round path) for that family's actual job story (e.g. `building-management`: log request → get levy/access info → confirm → `log_maintenance` → handoff-on-emergency).
2. Dispatch wired into `runtime/index.ts` (same pattern as the existing 9: `if (isX(req.agentId)) { ... }`).
3. At least one **live** connector actually exercised end-to-end, not stubbed (Slack handoff, Google Calendar booking, webhook, etc. — whichever the family's bindings already point at).
4. `docs/pilots/{family}.md` updated to `Depth: live` with a real evidence correlation id, matching the existing format (see `docs/pilots/dental-front-desk.md`: job story, golden path turns, live connectors required, `Depth: live`, `Evidence: corr_...`).
5. A passing `pnpm eval:live` run against the family (not just the static/mock suite).
6. Unit test coverage for the new workflow module.

## Phase 1b — Cluster B members of the gap (flag, do not silently include)

`customer-support`, `delivery-tracking`, `trades-receptionist` are also missing depth, but see the guardrail above. If you take these on: runtime-layer-only, their `.agent.json` files untouched. If in doubt, skip and report back rather than proceed.

---

## Phase 2 — CONFIRMED: Financial services (do this now)

**Malcolm's pick, with data behind it** (families.json cross-tabulated by tier + existing depth coverage):

| Industry | Total families | Enterprise-tier | Depth-covered today |
|---|---:|---:|---:|
| **Financial services** | 18 | **7** (largest cluster) | 2 |
| Retail & e-commerce | 32 | 6 | 5 |
| Legal & professional | 4 | 3 | 0 |
| Health & wellness | 4 | 0 | 3 |

Financial services has the platform's largest enterprise-tier concentration (7 of 20 enterprise families) and is virtually unclaimed on depth (2/18) relative to its size — the biggest value-weighted gap in the catalogue. It also pairs narratively with the recent security/persistence hardening (Phases 0–5 + punch-list): "hardened enough for finance" + real financial-services depth is a stronger enterprise pitch than either alone.

**Starter 3 families** (span consumer-fintech, high-net-worth, and SMB/compliance — deliberately not overfit to one buyer type):

| Family | Tier | Why this one first |
|---|---|---|
| `mobile-money` | enterprise | consumer-fintech, highest transaction-frequency use case |
| `wealth-management` | enterprise | high-net-worth advisory, highest per-seat value |
| `tax-office` | enterprise | SMB/compliance-driven, broadest reach |

Bring these 3 to the exact same Phase 1a acceptance bar (workflow module + dispatch + tests + `Depth: strong` pilot doc with honest evidence + `eval:live` support). Use the same guardrail: label `Depth: strong` unless a real live-OAuth/`eval:live` proof exists — do not repeat the live-vs-strong labeling issue from Phase 1a.

**Optional fast-win alongside it:** `veterinary` has no workflow module today (confirmed — `packages/runtime/src/workflows/veterinary.ts` doesn't exist) but its pilot doc already says `Depth: strong`, and it's the last piece needed to complete health & wellness (currently 3/4 depth-covered — dental-front-desk, clinic-front-desk, salon-booking, pharmacy already done). Cheap to close, and lets the platform credibly claim one *fully complete* vertical, which is a different proof point than breadth. Not required, but low-cost if there's spare capacity in this pass.

Remaining enterprise clusters (`legal-research`/`contract-review`/`law-firm-intake`/`policy-compliance`, and `cybersecurity-desk`/`security-incident`/`enterprise-connectivity`) are noted for a future Phase 2b — not in scope for this round.

---

## Phase 3 — Publish the eval:live scoreboard (after Phase 1a lands)

`scripts/eval-live.mjs` currently samples `--limit=N` generically (first N catalog packs found), not a named set. Extend it:

1. Add a `--families=<comma-list>` flag (or a named preset, e.g. `--set=go-live-18`) so it can target the hero set explicitly instead of whatever it samples today.
2. Once the Phase-1a families are live-eval-validated, produce a dated, public-facing scoreboard (a `/quality` or `/trust`-adjacent page, or a `docs/reports/eval-live-scoreboard-YYYY-MM-DD.md` if a page is out of scope this round) showing live-model pass rate **per hero family**, explicitly separated from the MockModel catalogue evals — same honest-labeling discipline as the compliance/DRAFT pages (`legal-content.ts`).
3. Do not claim or imply this covers the full 551-agent catalogue — label it as covering the hero/flagship set only.

---

## Deliverable

**Phase 1a: done** (see above).

**Phase 2 (this round):** the 3 financial-services workflow modules + dispatch + tests + pilot docs (`Depth: strong`, honest evidence line) + `eval:live` support, plus `veterinary` if pursued. A dated close note (`docs/reports/flagship-depth-phase2-close-YYYY-MM-DD.md`, same shape as the Phase 1a close note) listing what shipped per family. Update `docs/CLAUDE_HANDOFF.md` Active section to point Claude at it for independent verification — same acceptance bar as Phase 1a, same labeling discipline (`strong` vs `live` must match actual evidence).

Phase 3: separate close note once undertaken.

---

## Out of scope for this round

- Adding new families to the catalogue.
- Refactoring the hardcoded workflow-dispatch if-chain into a registry (real architecture debt, separate item).
- Compliance/legal copy (counsel-blocked, unrelated to this push).
- Phase 2b (legal/professional, security/internal-ops enterprise clusters) — future round.
- Phase 1b (Cluster B) — still flagged, still not started, still requires explicit care if picked up.
