# UAT checklist — MyInstantAI Agent Marketplace

Human sign-off companion to automated `@uat` / `@functional` Playwright suites (`docs/TESTING.md`).

**Environment:** https://miaiweb-production.up.railway.app  
**Hero agent:** `us-customer-support`  
**Date:** 2026-08-02  **Tester:** Engineering guided pass (Playwright + API)  **Build / commit:** `feb6d43`

---

## A. Automated gates (run before human UAT)

```bash
pnpm run ci                  # unit + integrity + static evals
pnpm handover:staging        # full automated pack
```

| Gate | Pass? | Notes |
|---|---|---|
| `pnpm run ci` | ✅ | 2026-08-02 — unit + catalog integrity + static evals green |
| `pnpm handover:staging` | ✅ | **78/78** passed (~27s) against Railway staging |

---

## B. Buyer / partner demo journey (manual)

Guided eng run 2026-08-02 mapped each row to Playwright / API evidence on staging. Product owner still signs the demo feel.

| # | Scenario | Pass? | Notes |
|---|---|---|---|
| B1 | Home catalogue loads; search finds Customer Support | ✅ | `catalogue` UI + partner journey browse |
| B2 | Market chips / filter show **5 markets** (US, EU, Africa, Asia, Oceania) — no ZA chip | ✅ | `markets-za-fold` |
| B3 | Go-live 100 (`/?pilot=1`) shows stand-behind shortlist | ✅ | `partner-demo-journey` + `catalogue-filters` |
| B4 | Learn more opens capability brief for a family | ✅ | `catalogue-filters` Learn more dialog |
| B5 | Rent / setup opens Agent Studio for `us-customer-support` | ✅ | `agent-studio` + partner journey |
| B6 | Mock rent activates (or already rented) — status not stuck on error | ✅ | `POST /api/rent` → 200/201/409 |
| B7 | Knowledge step shows editable KB; save draft works | ✅ | `studio-setup` configure persist |
| B8 | Try chat: ask support hours → grounded answer (not empty / crash) | ✅ | sandbox chat + partner journey try step |
| B9 | Install step shows `agent.js` snippet and/or App URL after rent | ✅ | partner journey install surface |
| B10 | `/trust`, `/privacy`, `/terms` readable for diligence | ✅ | `secondary-pages` + acceptance-bar |

---

## C. Pilot production bar (sample — hero family)

From [`PILOT_PRODUCTION_BAR.md`](./PILOT_PRODUCTION_BAR.md):

| Criterion | Pass? | Notes |
|---|---|---|
| Job story clear in studio / pilot doc | ✅ | Studio shell + Go-live docs |
| Golden path 5–8 turns in Studio | ☐ | Sampled 1–2 turns automated; full multi-turn = product demo |
| Knowledge feels tenant-replaceable | ✅ | Configure + knowledge API persist |
| Out-of-scope / unsafe refusal observed | ✅ | Card / jailbreak / cross-tenant refusals |
| Embed or App path documented | ✅ | Install step + `/install` + embed SRI |
| History / correlation visible when Insights enabled | ✅ | `/api/history/turns`, chat correlation id |

---

## D. Ops bar (staging)

| Check | Pass? | Evidence |
|---|---|---|
| `/api/health` → `status` ok/degraded, not failing | ✅ | `status=ok`, `hardening=ok` |
| `storeBackend=postgres`, `storePing=ok` | ✅ | postgres / ok |
| `redisPing=ok` (B+) or documented `not_configured` | ✅ | `redisPing=ok` |
| Catalogue `totalAgents=500` | ✅ | 500; packs `us,eu,africa,asia,oceania` |

```bash
curl -sS https://miaiweb-production.up.railway.app/api/health | jq '{status,storeBackend,storePing,redisPing}'
curl -sS https://miaiweb-production.up.railway.app/api/catalog | jq '{totalAgents,packs:[.packs[].id]}'
```

---

## Sign-off

| Role | Name | Signature / date |
|---|---|---|
| Product / demo owner | Malcolm Govender | ☐ pending human eyeball on live demo |
| Engineering | Guided automated UAT | 2026-08-02 · `feb6d43` · 78/78 |
| Partner observer (optional) | | |

**Verdict:** ☑ Ready with caveats  ☐ Ready for partner demo  ☐ Blocked  

**Caveats / blockers:**
- Staging still on **mock rails** (`mockRailsAllowed=true`) — expected until OIDC/wallet cutover.
- Full **5–8 turn** golden path per Go-live family not automated (C row above).
- Live connector proofs and counsel-signed legal remain out of scope for this pack.
- Product owner should spot-check B8 answer quality in a live Studio session before calling partner demo “ready.”
