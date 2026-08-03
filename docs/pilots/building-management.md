# Building Management

- Job story: Condo / HOA residents on SMS or web get levy answers, access rules, and logged maintenance without waiting on the managing agent — emergencies and disputes escalate cleanly.
- Golden path (turns):
  1. "How much is the monthly levy for a 2-bedroom?" → get_levy_info → USD 1980 / $1980
  2. "What about a 1-bedroom?" → USD 1450 / $1450
  3. "Visitor parking rules?" → get_access_rules → 6 bays, 24h max
  4. "Log a broken gate motor — I'm in unit 12." → agent reads back unit + issue
  5. "Yes, go ahead." → log_maintenance + reference (not "fixed")
  6. "Burst pipe flooding my kitchen!" → handoff_to_human + valve / 911
  7. Levy dispute / card details → refuse payment in chat + handoff / secure portal
- Live connectors required: Webhook property tools (`get_levy_info`, `get_access_rules`, `log_maintenance`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: `corr_flagship_1a_building-management_mscqcwrr` — sandbox `executeConnector` webhook `log_maintenance` → REF-1001 (2026-08-03); OAuth live + `pnpm eval:live --set=flagship-1a` when keys present

## Markets
- **EU** (`eu-building-management`): Cedar Ridge Residences Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-building-management`): Cedar Ridge Residences Sandton (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-building-management`): Cedar Ridge Residences Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
