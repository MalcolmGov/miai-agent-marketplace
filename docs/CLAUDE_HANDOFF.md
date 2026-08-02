# Claude handoff — active task

## Active: full audit of 500 agents

**Brief:** [`docs/CLAUDE_AUDIT_500.md`](./CLAUDE_AUDIT_500.md)

Run the automated gates (catalogue-ready, eval suite, certify go-live, production status), spot-check a small Studio sample, and write `docs/reports/audit-500-YYYY-MM-DD.md`.

```bash
pnpm generate:presets && pnpm build:packages
pnpm catalog:ready
pnpm eval:suite
pnpm certify:golive
pnpm production:status
```

---

## Prior context (do not undo)

| Slice | Owner | Status |
|---|---|---|
| Wave 3 market localization | Cursor + Claude | Done |
| Go-live Cluster B deepen | Claude | Done — **protected from overwrite** |
| Go-live 100 stand-behind | Cursor | Done (`ca8f60d`) — filter `/?pilot=1` |
| Depth strong 100/100 | Cursor | Done |
| Eval suite (wave packs) | Cursor | Was 100% on last gap report |

**Do not re-deepen Cluster B** (`restaurant-takeaway` · `salon-booking` · `clinic-front-desk` · `customer-support` · `delivery-tracking` · `trades-receptionist`). Scripts hard-skip these.

## Optional after audit

- Heal only families that fail layers B–D in the audit
- Wave 4 live connectors: `pnpm proof:live` · `docs/WAVE4_LIVE_CONNECTORS.md` (stretch; not catalogue blocker)
