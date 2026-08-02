# Parallel workstreams — scale to 220

Goal: production comfort on **all 220** agents. See `PRODUCTION_SCALE_220.md`.

## Rules

1. One family (or market-pack set) = one owner until merged.
2. Deepeners edit only:
   - `data/catalog/{market}-{family}.agent.json`
   - `docs/pilots/{family}.md` (append **Markets** notes only)
3. Platform files (`monday-pilot.ts`, CatalogGrid, runtime): single owner.
4. No demo/Monday-pitch copy.
5. Do **not** edit `us-*.agent.json` unless fixing a regression (Wave 2 locked).

## Ownership now

| Worker | Own |
|---|---|
| **Claude Wave 3 — Go-live 18** | Cluster **B done**; continue **A + C**. Cursor scripts hard-skip these packs. |
| **Cursor Wave 3 — D/E/F** | **Done** — 37 families × 3 markets deepened; static eval drift 0; presets regenerated. |

### Go-live 18 (Claude only)

executive-assistant · it-helpdesk · dental-front-desk · hotel-guest · sales-qualifier · home-services · restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist · events-venue · onboarding-buddy · accounting-practice · building-management · gym-membership · pharmacy

## Status

```bash
pnpm production:status
```

## Note on Africa files

`pnpm generate:packs` emits prefixed `africa-{family}.agent.json` from the strong US hero. Legacy unprefixed ZA files may remain on disk as source archives; the marketplace index prefers `africa-*`.
