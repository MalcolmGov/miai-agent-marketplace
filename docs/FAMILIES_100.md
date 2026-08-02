# Catalogue expansion: 55 → 100 families

**SKU model (locked):** **family × market pack**. **100 families × 5 markets = 500 agents**.

## Milestones

| Milestone | Families | Packs | Agents |
|---|---:|---:|---:|
| Baseline | 55 | 5 | 275 |
| Wave 1 | 70 | 5 | 350 |
| Wave 2 | 82 | 5 | 410 |
| Wave 3 | 92 | 5 | 460 |
| **Wave 4 (complete)** | **100** | 5 | **500** |

## Wave 4 family ids (8) — done

**Cybersecurity:** `cybersecurity-desk`, `security-incident`  
**Energy:** `energy-operations`  
**Agriculture:** `farm-operations`, `agri-advisory`  
**Media:** `media-content-desk`  
**HR:** `learning-development`, `performance-reviews`

## Prior waves

See git history / earlier sections in commits. Sectors: `apps/web/src/lib/sectors.ts`.

## Definition of Done (Wave 4)

- [x] 8 new US heroes + pilots + 5 packs each
- [x] New Industry labels: Cybersecurity, Energy & utilities, Agriculture, Media & entertainment
- [x] `catalog:ready` green; production **500 / 500**
- [x] Commercial copy: **100 × 5 = 500**

## Commands

```bash
node scripts/scaffold-wave4-families.mjs
pnpm generate:packs
pnpm generate:presets && pnpm --filter @miai/presets build
pnpm catalog:ready && pnpm production:status
pnpm generate:ask-digest
```
