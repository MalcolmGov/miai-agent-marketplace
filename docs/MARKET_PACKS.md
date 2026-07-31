# Market packs

Commercial model for the Agent Marketplace: sell **agent families**, expand with **market packs**.

## Markets

| Market | Role | Id convention |
|--------|------|-----------------|
| **US** | Sellable pack | `us-{family}` |
| **EU** | Sellable pack | `eu-{family}` |
| **Africa** | Sellable pack | `africa-{family}` |
| **Asia** | Sellable pack | `asia-{family}` |
| **ZA** | Separate installed base (not a pack SKU) | unprefixed `{family}` |

ZA is kept as its own market filter. Africa is **not** a rename of ZA — it is a distinct pack.

## Catalogue shape

- **~55 families** (unique jobs / verticals)
- Each family has **US / EU / Africa / Asia** variants
- Many families also have a **ZA** variant from the original catalogue
- Flat agent count is larger (~270); buyer-facing UI defaults to **family cards** with pack chips

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

- Pitch **55 catalogue-ready agent products**, not 270 unique inventions
- Market packs are **localization / compliance / channel expansions** of a family
- Recommended SKU language: `{Family} + {US|EU|Africa|Asia} pack`
- ZA can be positioned as the current South Africa footprint alongside the four regional packs
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
`?market=us|eu|africa|asia|za` — filter by market / pack
