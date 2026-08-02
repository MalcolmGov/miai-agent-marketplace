# Catalogue expansion: 55 → ~100 families

**SKU model (locked):** **family × market pack**. Sell **~100 families**, each localized across **US / EU / Africa / Asia / Oceania**. At full scale: **~100 × 5 ≈ 500** agents.

## Current → waves → target

| Milestone | Families | Packs | Agents |
|---|---:|---:|---:|
| Baseline (pre–Wave 1) | 55 | 5 | 275 |
| Wave 1 | 70 | 5 | 350 |
| Wave 2 | 82 | 5 | 410 |
| **Wave 3 (this delivery)** | **92** | 5 | **460** |
| Target | ~100 | 5 | ~500 |

## Sector taxonomy

Includes **AI & developer tools** and **Data & analytics** (Wave 3). Registry: `apps/web/src/lib/sectors.ts`.

## Backlog waves

| Wave | Theme | New families | Running total |
|---|---|---:|---:|
| 1 | Telecom, Gov, Mfg, Banking+, HR+, Legal+ | 15 | 70 |
| 2 | Remaining Telecom/Gov/Mfg; Banking wealth/fraud; Legal case/research | 12 | 82 |
| **3** | AI & developer tools + Data & analytics | **10** | **92** |
| 4 | Cybersecurity, Energy, Agriculture, Media (+ HR L&D / performance) | ~8+ | **~100** |

## Wave 3 family ids (10) — done

**AI & developer tools:** `ai-coding-assistant`, `documentation-assistant`, `qa-testing`, `devops-assistant`, `prompt-engineering`  
**Data & analytics:** `bi-analyst`, `financial-reporting`, `sales-forecasting`, `executive-dashboards`, `data-quality`

Queued (Wave 4): Cybersecurity, Energy, Agriculture, Media; HR `learning-development` / `performance-reviews`. LatAm / MENA packs deferred.

## Wave 3 Definition of Done

- [x] 10 new US heroes + pilots + 5 market packs each
- [x] Industry filter shows AI & developer tools / Data & analytics
- [x] `catalog:ready` green; production **460 / 460**
- [x] Commercial copy: **92 × 5 = 460**, roadmap to **100 × 5 = 500**

## Commands

```bash
node scripts/scaffold-wave3-families.mjs
pnpm generate:packs
pnpm generate:presets && pnpm --filter @miai/presets build
pnpm catalog:ready && pnpm production:status
pnpm generate:ask-digest
```
