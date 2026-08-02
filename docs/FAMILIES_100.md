# Catalogue expansion: 55 → ~100 families

**SKU model (locked):** **family × market pack**. Sell **~100 families**, each localized across **US / EU / Africa / Asia / Oceania**. At full scale: **~100 × 5 ≈ 500** agents.

Do **not** replace families with “individual agents” as the buyer headline — packs are localization, not a substitute for breadth of job families.

## Current → Wave 1 → target

| Milestone | Families | Packs | Agents |
|---|---:|---:|---:|
| Baseline (pre–Wave 1) | 55 | 5 | 275 |
| **Wave 1 (this delivery)** | **70** | 5 | **350** |
| Target | ~100 | 5 | ~500 |

Buyer story: **sector → family**; market pack is a filter/chip.

## Sector taxonomy

| Sector id | Label |
|---|---|
| `telecom` | Telecommunications |
| `government` | Government & public sector |
| `manufacturing` | Manufacturing & industrial |
| `financial` | Financial services |
| `healthcare` | Health & wellness |
| `retail` | Retail & e-commerce |
| `hospitality` | Hospitality & travel |
| `logistics` | Logistics & field ops |
| `property` | Property |
| `education` | Education |
| `professional` | Professional services |
| `hr_internal` | HR & internal ops |
| `ai_devtools` | AI & developer tools *(later)* |
| `data_analytics` | Data & analytics *(later)* |

Registry: `apps/web/src/lib/sectors.ts` · industry labels from `marketplaceCategory()` in `@miai/agent-protocol`.

## Backlog waves

| Wave | Theme | New families | Running total |
|---|---|---:|---:|
| **1** | Telecom, Government, Manufacturing, Banking+, HR+, Legal+ | **15** | **70** |
| 2 | Remaining Telecom/Gov/Mfg; Banking wealth/fraud; Legal case/research | ~12 | ~82 |
| 3 | AI & developer tools + Data & analytics | ~10 | ~92 |
| 4 | Cybersecurity, Energy, Agriculture, Media | ~8+ | **~100** |

## Wave 1 family ids (15)

**Telecom:** `sim-registration`, `airtime-bundles`, `fibre-support`, `network-faults`  
**Government:** `citizen-services`, `municipality-desk`, `tax-office`  
**Manufacturing:** `warehouse-operations`, `maintenance-desk`, `quality-assurance`  
**Banking:** `mortgage-advisor`, `credit-cards`  
**HR:** `recruitment`, `interview-scheduling`  
**Legal:** `contract-review`

Queued (not Wave 1): Passport & Visa, Social Services, Licensing, Factory Ops / Production Planning, Device Upgrades, Enterprise Connectivity, Wealth/Investment/Fraud, Case Management, Legal Research, L&D, Performance Reviews, all AI/Data families. LatAm / MENA packs deferred.

## Wave 1 Definition of Done

- [x] 15 new US heroes in `data/catalog/us-*.agent.json` + pilot stubs in `docs/pilots/`
- [x] All 5 market packs generated per family
- [x] Industry filter shows Telecommunications, Government & public sector, Manufacturing & industrial
- [x] `pnpm catalog:ready` green; `pnpm production:status` reports **350 / 350** pack slots
- [x] Commercial copy: **70 families × 5 = 350**, roadmap to **100 × 5 = 500**
- Depth *strong* / live connectors for Wave 1 families: **follow-on** (first-pass packs OK)

## Commands

```bash
node scripts/scaffold-wave1-families.mjs   # US heroes + pilots
pnpm generate:packs
pnpm generate:presets && pnpm --filter @miai/presets build
pnpm catalog:ready
pnpm production:status
pnpm generate:ask-digest
```
