# Claude handoff — scale to 220 (production)

**Context:** Partner demo is done. Goal = **production comfort across all 220 agents** (55 families × 4 packs).

## Current state

- **Wave 1 done:** 18 US heroes at Depth strong + `docs/pilots/{family}.md`
- **Wave 2 (Cursor):** remaining ~37 US heroes
- **Wave 3 (Claude — your lane):** localize market packs for families that already have strong US heroes

## Your ownership (Wave 3) — no collisions with Cursor US work

For **each** family listed under Wave 1 strong US (see `node scripts/production-wave-status.mjs`), deepen:

- `data/catalog/eu-{family}.agent.json`
- `data/catalog/africa-{family}.agent.json`
- `data/catalog/asia-{family}.agent.json`

**Do not edit** `us-*.agent.json` while Cursor Wave 2 is running.

### Start order (Cluster B first, then A, then C)

1. restaurant-takeaway, salon-booking, clinic-front-desk, customer-support, delivery-tracking, trades-receptionist  
2. executive-assistant, it-helpdesk, dental-front-desk, hotel-guest, sales-qualifier, home-services  
3. events-venue, onboarding-buddy, accounting-practice, building-management, gym-membership, pharmacy  

## Per market-pack file

1. Localize knowledge: currency, emergency numbers, compliance (GDPR / POPIA-style / PDPA-style), hours, phone formats  
2. Preserve confirm-before-write + handoff from US hero intent  
3. Fix knowledge↔eval drift (`says_any` must appear in knowledge)  
4. Append a **Markets** section to `docs/pilots/{family}.md` (do not erase US job story)

## Done means

A customer in that market can Rent → configure → connect tools → go live without hand-holding.

## Do not

- Touch `monday-pilot.ts`, CatalogGrid, runtime core  
- Add demo/Monday pitch language  
- Claim live OAuth without credentials  
