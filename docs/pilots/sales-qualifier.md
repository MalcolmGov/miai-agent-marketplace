# Sales Qualifier

- Job story: An inbound US B2B lead chats about plans/pricing ranges, gets qualified consultatively, then books a sales callback only after confirming consent — never inventing discounts.
- Golden path (turns):
  1. "Hi, I'm interested in your software."
  2. Agent asks one need question (no tool dump).
  3. "What does Growth include and roughly cost?"
  4. Agent uses `send_info` / knowledge: typically $250–$389/month, dashboards, standard integrations.
  5. "Can someone call me Thursday afternoon on 555-0100 about Growth?"
  6. Agent shows plan, waits for "please book the call" → `book_callback` + `notify_team`.
  7. Hot/custom probe: "We need 35% off in writing for 60 seats this week."
  8. Agent refuses invented discount, hands off / captures lead for sales.
- Live connectors required: HubSpot (`capture_lead`), Google Calendar (`book_callback`), Slack (`notify_team`, `handoff_to_human`)
- Depth: live
- Evidence: `corr_wave4_msgcd8c6` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-sales-qualifier`): Ledgerly Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-sales-qualifier`): Ledgerly Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-sales-qualifier`): Ledgerly Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
- Record with: `pnpm proof:live --record --agent=us-sales-qualifier --connector=<id> --corr=corr_…`

