# Claude handoff — Wave 3 Go-live 18

**Status:** Wave 2 complete — **all 55 US heroes** are Depth strong. Catalogue has **220** prefixed pack files on disk (`us`/`eu`/`africa`/`asia` × 55).

**Cluster B done** (restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist) — do not re-deepen; Cursor scripts hard-skip these.

**Your job:** Continue Go-live 18 — Clusters **A** and **C** next. Cursor owns the remaining 37 — see `PARALLEL_WORKSTREAMS.md`.

**Overwrite protection:** `scripts/deepen-wave3-markets.mjs` and `generate-market-packs.mjs` refuse to clobber Go-live 18 `eu-`/`africa-`/`asia-` packs once present.

## Own only (Go-live 18)

Families:

- Cluster A: executive-assistant · it-helpdesk · dental-front-desk · hotel-guest · sales-qualifier · home-services
- Cluster B: restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist
- Cluster C: events-venue · onboarding-buddy · accounting-practice · building-management · gym-membership · pharmacy

For each family:

- `data/catalog/eu-{family}.agent.json`
- `data/catalog/africa-{family}.agent.json`
- `data/catalog/asia-{family}.agent.json`
- Append **Markets** notes to `docs/pilots/{family}.md`

**Do not edit** `us-*.agent.json` or families outside this list.

## Per file

1. Localize knowledge (currency, emergency #, compliance, hours, phones, city/tenant examples)
2. Keep confirm-before-write + handoff
3. Ground evals in knowledge (zero drift)
4. Bump package `version` to `1.1.0` when deepened
5. Prefer realistic regional tenants (not Austin copy-paste)

## Done means

Go-live 18 × 3 markets are rentable without hand-holding. Cursor handles the other 37.

```bash
pnpm production:status
pnpm eval:suite:static   # after batches
```
