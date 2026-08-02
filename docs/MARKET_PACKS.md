# Market packs

Commercial model for the Agent Marketplace: sell **agent families**, expand with **market packs**.

## Markets

| Market | Role | Id convention |
|--------|------|-----------------|
| **US** | Sellable pack | `us-{family}` |
| **EU** | Sellable pack | `eu-{family}` |
| **Africa** | Sellable pack (includes former ZA footprint) | unprefixed `{family}` or `africa-{family}` |
| **Asia** | Sellable pack | `asia-{family}` |
| **Oceania** | Sellable pack (AU / NZ / Pacific) | `oceania-{family}` |

ZA has been **merged into Africa**. Former ZA packages keep stable unprefixed ids; duplicate generated `africa-*` variants were removed.

## Catalogue shape

- **82 families** (unique jobs / verticals)
- Each family has **US / EU / Africa / Asia / Oceania** variants (410 agents total)
- Buyer-facing UI defaults to **family cards** with pack chips and shows family + agent counts

## Files

- `data/catalog/market-packs.json` — pack defaults (compliance, languages, channels, locale cues)
- `data/catalog/families.json` — family → variant id map (regenerated)
- `data/catalog/index.json` — flat agent index (regenerated)
- `data/catalog/{id}.agent.json` — full agent packages
- `scripts/generate-market-packs.mjs` — idempotent generator for missing pack variants

## Regenerating packs

```bash
node scripts/generate-market-packs.mjs
```

Skips existing files. Safe to re-run after importing new ZA/US/EU agents.

## Sales framing (MyInstantAI)

- Pitch **82 catalogue-ready agent products**, not 410 unique inventions
- Market packs are **localization / compliance / channel expansions** of a family
- Recommended SKU language: `{Family} + {US|EU|Africa|Asia|Oceania} pack`
- Africa pack includes the former ZA footprint (no separate ZA SKU)
- Full claim language and caveats: [CATALOGUE_READY.md](./CATALOGUE_READY.md)

## Polishing / readiness

```bash
pnpm polish:catalog      # rich overlays + fill gate fields
pnpm generate:presets    # connector presets for all agents
pnpm build:packages && pnpm catalog:ready
```

## API

`GET /api/catalog?view=families` (default) — family cards with `markets`, `packs`, `defaultAgentId`  
`GET /api/catalog?view=agents` — flat variant list  
`?market=us|eu|africa|asia|oceania|za` — filter by market / pack
