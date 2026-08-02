# Parallel workstreams — scale to 500

Goal: production comfort on **all 500** agents. See `PRODUCTION_SCALE_410.md`.

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
| **Claude Wave 3 — Go-live Cluster B** | **Done** — hard-protected from overwrite |
| **Cursor Wave 3 — A + C + D/E/F** | **Done** — full 165 market packs localized; static eval drift 0 |

### Go-live 18 (Claude only)

executive-assistant · it-helpdesk · dental-front-desk · hotel-guest · sales-qualifier · home-services · restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist · events-venue · onboarding-buddy · accounting-practice · building-management · gym-membership · pharmacy

## Status

```bash
pnpm production:status
```

## Note on Africa files

`pnpm generate:packs` emits prefixed `africa-{family}.agent.json` from the strong US hero. Legacy unprefixed ZA files may remain on disk as source archives; the marketplace index prefers `africa-*`.
