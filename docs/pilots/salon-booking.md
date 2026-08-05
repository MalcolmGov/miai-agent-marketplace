# Salon & Barber Booking

- Job story: When a Chicago client messages Copper & Clip, they pick a real service and open chair, confirm once, and leave with a booking reference — deposits and complaints go to the desk, not the bot.
- Golden path (turns):
  1. Client: "What do men's cuts cost?"
  2. Agent: `$35` / durations from catalogue (`list_services`)
  3. Client: "Skin fade Saturday with Luis"
  4. Agent: `check_availability` → offers returned slots only
  5. Client: picks a time + name/phone
  6. Agent: numbered plan + confirm read-back
  7. Client: "Yes, book it" → `book_appointment` + reference + 24h policy; optional `notify_team`
  8. (Alt) Colour deposit question → `$40` secure link; card in chat refused
- Live connectors required: Google Calendar / Calendly (`check_availability` / `book_appointment`), Slack (`notify_team`)
- Depth: live
- Evidence: `corr_tools_msgdl4nl` — live `google_calendar` on https://miaiweb-production.up.railway.app (2026-08-05)

## Market packs (EU / Africa / Asia)

Region variants share the US hero's tools, confirm-before-write hard rule, and front-desk handoff; only the localized facts differ.

- **EU** (`eu-salon-booking`): euro pricing (Men's cut €35, Ladies €65, colour deposit €40); compliance GDPR (data-rights requests → human handoff); channels SMS / web / app; languages en, de, fr, es, it; emergency 112; Berlin example tenant.
- **Africa** (`africa-salon-booking`): currency-neutral pricing ("35 (local currency)", "65", "40" deposit — multi-country, no fixed symbol); compliance POPIA + regional privacy; WhatsApp is the primary channel (front desk continues on WhatsApp after handoff), plus web / app / SMS; languages en, fr, sw; emergency "local emergency services"; Nairobi example tenant.
- **Asia** (`asia-salon-booking`): currency-neutral pricing ("35 (local currency)", "65", "40" deposit); compliance PDPA + regional privacy (access / withdraw-consent → human handoff); channels web / app / SMS; languages en, zh, hi; emergency "local emergency services"; Singapore example tenant.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
