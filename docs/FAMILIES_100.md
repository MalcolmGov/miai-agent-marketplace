# Catalogue expansion: 55 → ~100 families

**SKU model (locked):** **family × market pack**. Sell **~100 families**, each localized across **US / EU / Africa / Asia / Oceania**. At full scale: **~100 × 5 ≈ 500** agents.

Do **not** replace families with “individual agents” as the buyer headline — packs are localization, not a substitute for breadth of job families.

## Current → waves → target

| Milestone | Families | Packs | Agents |
|---|---:|---:|---:|
| Baseline (pre–Wave 1) | 55 | 5 | 275 |
| Wave 1 | 70 | 5 | 350 |
| **Wave 2 (this delivery)** | **82** | 5 | **410** |
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
| `ai_devtools` | AI & developer tools *(Wave 3)* |
| `data_analytics` | Data & analytics *(Wave 3)* |

Registry: `apps/web/src/lib/sectors.ts` · industry labels from `marketplaceCategory()` in `@miai/agent-protocol`.

## Backlog waves

| Wave | Theme | New families | Running total |
|---|---|---:|---:|
| 1 | Telecom, Government, Manufacturing, Banking+, HR+, Legal+ | **15** | **70** |
| **2** | Remaining Telecom/Gov/Mfg; Banking wealth/fraud; Legal case/research | **12** | **82** |
| 3 | AI & developer tools + Data & analytics | ~10 | ~92 |
| 4 | Cybersecurity, Energy, Agriculture, Media (+ HR L&D / performance) | ~8+ | **~100** |

## Wave 1 family ids (15) — done

**Telecom:** `sim-registration`, `airtime-bundles`, `fibre-support`, `network-faults`  
**Government:** `citizen-services`, `municipality-desk`, `tax-office`  
**Manufacturing:** `warehouse-operations`, `maintenance-desk`, `quality-assurance`  
**Banking:** `mortgage-advisor`, `credit-cards`  
**HR:** `recruitment`, `interview-scheduling`  
**Legal:** `contract-review`

## Wave 2 family ids (12) — done

**Telecom:** `device-upgrades`, `enterprise-connectivity`  
**Government:** `passport-visa`, `social-services`, `licensing`  
**Manufacturing:** `factory-operations`, `production-planning`  
**Banking:** `wealth-management`, `investment-advisor`, `fraud-investigations`  
**Legal:** `case-management`, `legal-research`

Queued (Wave 3+): AI Coding / Docs / QA / DevOps / Prompt Engineering; BI Analyst / Financial Reporting / Sales Forecasting / Executive Dashboards; Cybersecurity, Energy, Agriculture, Media; HR L&D / Performance Reviews. LatAm / MENA packs deferred.

## Wave 2 Definition of Done

- [x] 12 new US heroes + pilots
- [x] All 5 market packs per family
- [x] `pnpm catalog:ready` green; `pnpm production:status` **410 / 410**
- [x] Commercial copy: **82 families × 5 = 410**, roadmap to **100 × 5 = 500**

## Commands

```bash
node scripts/scaffold-wave2-families.mjs
pnpm generate:packs
pnpm generate:presets && pnpm --filter @miai/presets build
pnpm catalog:ready
pnpm production:status
pnpm generate:ask-digest
```
