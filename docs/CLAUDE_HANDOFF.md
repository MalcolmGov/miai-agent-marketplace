# Claude handoff — Wave 3 complete (Go-live 18)

**Status:** Wave 3 market localization is complete across the catalogue.

| Slice | Owner | Status |
|---|---|---|
| Remaining 37 × 3 markets | Cursor | Done (`202d29d`) |
| Go-live Cluster B | Claude | Done — protected from overwrite |
| Go-live Clusters A + C | Cursor | Done — static eval drift 0 |

**Do not re-deepen Cluster B** (`restaurant-takeaway` · `salon-booking` · `clinic-front-desk` · `customer-support` · `delivery-tracking` · `trades-receptionist`). Scripts hard-skip these.

## Optional polish

- Hand-raise any Go-live A/C pack that needs Claude-level narrative depth beyond the automated regional tenant pass

## Wave 4 (live connectors)

Ops + evidence wave. Harness: `pnpm proof:live`. Checklist: `docs/WAVE4_LIVE_CONNECTORS.md`.
Unblock Slack / Google / HubSpot OAuth vars on Railway, Connect in Actions, then record correlation ids.

```bash
pnpm production:status
pnpm proof:live
pnpm eval:suite:static -- --agents <id-list>
```
