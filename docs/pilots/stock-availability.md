# Stock Availability

- Job story: Ridgeway shoppers check live branch stock and sizes, set back-in-stock alerts only after confirm, and never get a reservation from the agent.
- Golden path (turns):
  1. "RidgeRunner slate, men's US 10 at Domain?" → `check_stock`
  2. Missing size → ask which item/size first
  3. "Notify me when US 10 rust is back — 512-555-0166" → read-back → confirm
  4. "Yes" → `notify_when_available` (not a hold)
  5. Click & collect timing → about **2 hours** when ordered online
  6. Bulk school order → `handoff_to_human`
  7. Card in chat → refuse
- Live connectors required: Inventory service + notify queue (sandbox OK for strong)
- Depth: live
- Evidence: `corr_probe_slack_msgdl4vv` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-stock-availability`): Ridgeway Outfitters Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-stock-availability`): Ridgeway Outfitters Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-stock-availability`): Ridgeway Outfitters Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
