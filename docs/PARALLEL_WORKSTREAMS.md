# Parallel workstreams — scale to 220

Goal: production comfort on **all 220** agents. See `PRODUCTION_SCALE_220.md`.

## Rules

1. One family (or market-pack set) = one owner until merged.
2. Deepeners edit only:
   - `data/catalog/{market}-{family}.agent.json`
   - `docs/pilots/{family}.md`
3. Platform files (`monday-pilot.ts`, CatalogGrid, runtime): single owner.
4. No demo/Monday-pitch copy.

## Ownership now

| Worker | Own |
|---|---|
| Cursor Wave 2 Cluster D | US: admissions, agency-studio, bank-branch, bookkeeping, course-advisor, dental-practice, field-service, fleet-driver, front-desk, grant-stock-planner, hotel-concierge, hr-helpdesk |
| Cursor Wave 2 Cluster E | US: insurance-broker, insurance-claims, law-firm-intake, loan-prequalifier, loyalty-rewards, marketing-assistant, mobile-money, order-tracking, payment-disputes, payroll-queries, policy-compliance, procurement |
| Cursor Wave 2 Cluster F | US: product-finder, property-enquiries, remittance, rental-enquiries, returns-exchanges, spaza-merchant, stock-availability, student-helpdesk, tour-activity, travel-desk, utility-billing, vas-concierge, veterinary |
| **Claude Wave 3** | `eu-` / `africa-` / `asia-` for the **18 already-strong** US families — see `CLAUDE_HANDOFF.md` |

## Status

```bash
pnpm production:status
```
