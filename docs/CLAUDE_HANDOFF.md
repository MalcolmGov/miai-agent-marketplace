# Claude handoff — Wave 3 to 220

**Status:** Wave 2 complete — **all 55 US heroes** are Depth strong with `docs/pilots/{family}.md`.

**Your job:** Wave 3 — localize **every** market pack so the licensed catalogue is production-ready end-to-end (**220 agents**).

## Own only

For each of the 55 families:

- `data/catalog/eu-{family}.agent.json`
- `data/catalog/africa-{family}.agent.json`
- `data/catalog/asia-{family}.agent.json`

**Do not edit** `us-*.agent.json` (US heroes are locked unless fixing a regression).

## Priority batches

1. Original Go-live 18 (highest commercial visibility)  
2. Remaining 37 families  

Skip missing files if a pack truly doesn’t exist on disk (`pnpm production:status` lists gaps).

## Per file

1. Localize knowledge (currency, emergency #, compliance, hours, phones)  
2. Keep confirm-before-write + handoff  
3. Ground evals in knowledge (zero drift)  
4. Append **Markets** notes to `docs/pilots/{family}.md`

## Done means

`pnpm production:status` shows market packs present, and each pack could be rented by a customer in that region without hand-holding.

```bash
pnpm production:status
pnpm eval:suite:static   # after batches
```
