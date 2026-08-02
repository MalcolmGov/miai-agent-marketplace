# Claude handoff — active task

## Active: merge audit PR, then optional eval polish

**Audit done (2026-08-02):** PASS — see PR [#1](https://github.com/MalcolmGov/miai-agent-marketplace/pull/1) and `docs/reports/audit-500-2026-08-02.md`.

**Done after merge:** MockModel eval polish — `product-finder` / `student-helpdesk` / `tour-activity` → **0 fails**; ZA static-high → **0**. Suite **96.2%** (was 95.8%).

**Next (optional):**
- Next worst families: `remittance`, `hotel-guest`, `hr-helpdesk`
- Platform: confirm `{{business_name}}` tenant token fill on live Railway (runtime already materializes templates)

---

## ⚠️ NEVER delete unprefixed `data/catalog/*.agent.json`

Those **51 files are ZA (South Africa) market packs**, not orphans.

- `families.json` → `markets.za` / `hasZa: true`
- On disk = **500 international + 51 ZA = 551** (intentional)
- Only delete Finder junk: `* 2.json` / `*agent 2.json`

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
