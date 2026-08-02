# Parallel workstreams — production go-live

Partner demo is done. Parallel work exists to get **18 families production-ready**, not to rehearse a pitch.

## Rules

1. **One family (or market pack set) = one owner** until merged.
2. Prefer edits to:
   - `data/catalog/{market}-{family}.agent.json`
   - `docs/pilots/{family}.md`
3. Platform/shared files (`monday-pilot.ts`, CatalogGrid, runtime): **one owner only**.
4. No demo/Monday-pitch copy in product strings.

## Ownership (this push)

| Worker | Own |
|---|---|
| Cursor Cluster A | `us-` heroes: executive-assistant, it-helpdesk, dental-front-desk, hotel-guest, sales-qualifier, home-services |
| Cursor Cluster B | `us-` heroes: restaurant-takeaway, salon-booking, clinic-front-desk, customer-support, delivery-tracking, trades-receptionist (**done**) |
| Cursor Cluster C | `us-` heroes: events-venue, onboarding-buddy, accounting-practice, building-management, gym-membership, pharmacy |
| **Claude** | Market packs (`eu-` / `africa-` / `asia-`) for **Cluster B** first — see `CLAUDE_HANDOFF.md` |

## Production bar

`docs/PILOT_PRODUCTION_BAR.md`
