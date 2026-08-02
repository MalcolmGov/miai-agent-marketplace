# Claude task — full audit of 500 agents

**Owner:** Claude  
**Repo:** `miai-agent-marketplace` (`main`)  
**Scope:** all **100 families × 5 markets = 500** agents in `data/catalog/*-{family}.agent.json`  
**Goal:** independent verification that the commercial claim (catalogue-ready + Go-live 100 stand-behind) still holds, with a written gap report.

Do **not** invent new families. Do **not** re-deepen Go-live Cluster B (see `CLAUDE_HANDOFF.md`). Prefer report + minimal surgical fixes over mass rewrites.

---

## Layers to audit (keep separate)

| Layer | Meaning | Pass bar |
|-------|---------|----------|
| **A. On disk** | 500 prefixed packages exist | `us|eu|africa|asia|oceania` × 100 families |
| **B. Catalogue-ready** | Package quality gate | `pnpm catalog:ready` → **500/500** |
| **C. Evals** | Static + MockModel runtime | `pnpm eval:suite` → **0 fails** (expect ~12 evals × 500) |
| **D. Go-live stand-behind** | Commercial shortlist | `pnpm certify:golive` → **100/100** |
| **E. Depth** | Pilot docs | Depth strong\|live for 100 families; Depth live tracked separately |
| **F. Platform rails** | Auth / wallet / model / Azure | Out of catalogue audit — note only if broken in Studio smoke |

Safe commercial claim if A–D green. Depth live (~8 today) and SSO/wallet cutover are **not** catalogue blockers.

---

## Commands (run in order)

```bash
cd /path/to/miai-agent-marketplace
pnpm install
pnpm generate:presets && pnpm build:packages

# A — inventory
ls data/catalog/*.agent.json | wc -l   # expect 500
# ignore Finder junk: *'agent 2.json' — do not audit or commit those

# B — catalogue gate
pnpm catalog:ready
# expect: ready N/N with N=500 (or report blocked ids)

# C — zero-token eval suite (full 500)
pnpm eval:suite
# optional: pnpm eval:suite:static
# optional slice: pnpm eval:suite -- --market us

# D — go-live stand-behind
pnpm certify:golive
# subsets: --wave55 · --next37 · --beyond55

# E — depth / wave status
pnpm production:status
```

If evals fail: try `pnpm fix:evals` then re-run suite; only then `pnpm eval:full` (heal loop). Document every family you change.

---

## Manual spot-check (sample, not all 500)

Pick **one agent per market** from Go-live 18 featured set + **three** from the +45 Go-live 100 list. For each:

1. Open `/agents/{id}` on staging or local (`pnpm --filter @miai/web dev`)
2. Confirm Knowledge → Connect tools → Sandbox → Rent/Pay → Go live order
3. Sandbox: 5–8 turn golden path; confirm-before-write on a side-effect tool
4. Handoff path when out of scope
5. Note correlation id / History if available

Staging: `https://miaiweb-production.up.railway.app`  
Featured: `/demo` · Filter: `/?pilot=1`

---

## Deliverable

Write **`docs/reports/audit-500-YYYY-MM-DD.md`** with:

1. **Verdict** — one paragraph (pass / pass-with-gaps / fail)
2. **Scoreboard**

| Check | Result |
|-------|--------|
| Packages on disk | x/500 |
| `catalog:ready` | x/500 |
| Eval runtime pass | x/y (rate %) |
| Static high-severity | n |
| `certify:golive` | x/100 |
| Depth strong\|live families | x/100 |
| Depth live (stretch) | x |

3. **Blocked / gaps** — table: agent id · layer · issue · severity · fix suggestion  
4. **Families touched** — commits or file list if you healed anything  
5. **What not claimed** — platform rails, Depth live, mock pay  

Also refresh `docs/reports/eval-gap-YYYY-MM-DD.md` if the suite writes/updates gap data (mirror prior reports).

---

## Reference docs

| Doc | Use |
|-----|-----|
| `docs/CATALOGUE_READY.md` | Commercial catalogue claim |
| `docs/PILOT_PRODUCTION_BAR.md` | Depth / go-live definition |
| `docs/PRODUCTION_SCALE_500.md` | Wave status |
| `docs/MONDAY_COMMERCIAL_PACK.md` | What sales may say |
| `apps/web/src/lib/monday-pilot.ts` | Go-live 18 / 55 / 100 IDs |
| `docs/WAVE4_LIVE_CONNECTORS.md` | Depth live only (stretch) |

---

## Constraints

- Zero-token evals only unless Malcolm asks for live LLM spend  
- Do not commit `data/catalog/*agent 2.json` (macOS duplicates)  
- Do not rotate/print Railway secrets  
- Prefer small PRs: report first; fixes second if green path needs heal  
- When done: commit report (+ any fixes) and push, or leave a PR summary for Cursor

**Kickoff one-liner for Claude:**  
*Follow `docs/CLAUDE_AUDIT_500.md` — full 500-agent audit; deliver `docs/reports/audit-500-<today>.md`.*
