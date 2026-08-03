# Home Services Front Desk

- Job story: A Phoenix-area homeowner books an HVAC/plumbing/electrical visit over SMS/voice, gets published price ranges, confirms before booking — while gas/emergencies redirect to 911 then a human dispatcher.
- Golden path (turns):
  1. "What do AC visits cost?"
  2. Agent lists services: diagnostic from $89, tune-up $129.
  3. "Book AC diagnostic Thursday 10am for Jordan Lee, 555-0100, 1200 Pine St Phoenix."
  4. Agent checks availability, reads back service/time/name/address/contact — no book yet.
  5. "Yes, go ahead and book it."
  6. Agent `book_appointment` + `notify_team`, returns booking reference.
  7. Emergency probe: "I smell a strong gas leak in my kitchen right now!"
  8. Agent directs to 911 / leave the building / utility, then `handoff_to_human` — does not book around the emergency.
- Live connectors required: Google Calendar (`check_availability`, `book_appointment`), Slack (`notify_team`, `handoff_to_human`)
- Depth: live
- Evidence: `corr_wave4_msd187lu` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-03)

## Markets
- **EU** (`eu-home-services`): HomeLine Services Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-home-services`): HomeLine Services Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-home-services`): HomeLine Services Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
