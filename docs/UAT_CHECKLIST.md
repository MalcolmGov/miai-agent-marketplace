# UAT checklist — MyInstantAI Agent Marketplace

Human sign-off companion to automated `@uat` / `@functional` Playwright suites (`docs/TESTING.md`).

**Environment:** https://miaiweb-production.up.railway.app  
**Hero agent:** `us-customer-support`  
**Date:** _______________  **Tester:** _______________  **Build / commit:** _______________

---

## A. Automated gates (run before human UAT)

```bash
pnpm run ci                  # unit + integrity + static evals
pnpm handover:staging        # full automated pack (target 76/76)
```

| Gate | Pass? | Notes |
|---|---|---|
| `pnpm run ci` | ☐ | |
| `pnpm handover:staging` 76/76 | ☐ | See [`HANDOVER_TEST_PACK.md`](./HANDOVER_TEST_PACK.md) |

---

## B. Buyer / partner demo journey (manual)

| # | Scenario | Pass? | Notes |
|---|---|---|---|
| B1 | Home catalogue loads; search finds Customer Support | ☐ | |
| B2 | Market chips / filter show **5 markets** (US, EU, Africa, Asia, Oceania) — no ZA chip | ☐ | |
| B3 | Go-live 100 (`/?pilot=1`) shows stand-behind shortlist | ☐ | |
| B4 | Learn more opens capability brief for a family | ☐ | |
| B5 | Rent / setup opens Agent Studio for `us-customer-support` | ☐ | |
| B6 | Mock rent activates (or already rented) — status not stuck on error | ☐ | |
| B7 | Knowledge step shows editable KB; save draft works | ☐ | |
| B8 | Try chat: ask support hours → grounded answer (not empty / crash) | ☐ | |
| B9 | Install step shows `agent.js` snippet and/or App URL after rent | ☐ | |
| B10 | `/trust`, `/privacy`, `/terms` readable for diligence | ☐ | |

---

## C. Pilot production bar (sample — hero family)

From [`PILOT_PRODUCTION_BAR.md`](./PILOT_PRODUCTION_BAR.md):

| Criterion | Pass? | Notes |
|---|---|---|
| Job story clear in studio / pilot doc | ☐ | |
| Golden path 5–8 turns in Studio | ☐ | |
| Knowledge feels tenant-replaceable | ☐ | |
| Out-of-scope / unsafe refusal observed | ☐ | |
| Embed or App path documented | ☐ | |
| History / correlation visible when Insights enabled | ☐ | |

---

## D. Ops bar (staging)

| Check | Pass? | Evidence |
|---|---|---|
| `/api/health` → `status` ok/degraded, not failing | ☐ | |
| `storeBackend=postgres`, `storePing=ok` | ☐ | |
| `redisPing=ok` (B+) or documented `not_configured` | ☐ | |
| Catalogue `totalAgents=500` | ☐ | |

```bash
curl -sS https://miaiweb-production.up.railway.app/api/health | jq '{status,storeBackend,storePing,redisPing}'
curl -sS https://miaiweb-production.up.railway.app/api/catalog | jq '{totalAgents,packs:[.packs[].id]}'
```

---

## Sign-off

| Role | Name | Signature / date |
|---|---|---|
| Product / demo owner | | |
| Engineering | | |
| Partner observer (optional) | | |

**Verdict:** ☐ Ready for partner demo  ☐ Ready with caveats  ☐ Blocked  

**Caveats / blockers:**
