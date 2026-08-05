# Trades Receptionist

- Job story: When a Denver homeowner messages Ridgeline Trades, they get a published price range and a confirmed job slot — gas/electrical emergencies go to 911 first, then dispatch.
- Golden path (turns):
  1. Homeowner: "What does drain clearing start at?"
  2. Agent: from `$99` via `list_services` / knowledge
  3. Homeowner: "Book drain clearing Thursday 10:00 — Alex Rivera, 303-555-0100, 100 Main St"
  4. Agent: `check_availability` → numbered plan + read-back (no write yet)
  5. Homeowner: "Yes, please book it"
  6. Agent: `book_appointment` → reference; optional `notify_team`
  7. (Alt) Full rewire → `request_estimate` (no flat price)
  8. (Alt) Gas smell → **911** / leave building + gas utility, then `handoff_to_human` (no booking)
- Live connectors required: Google Calendar / Field Service scheduling; Slack/Teams dispatch; optional QuickBooks for invoices (human-only)
- Depth: live
- Evidence: `corr_wave4_msgcbibi` — live `google_calendar` on https://miaiweb-production.up.railway.app (2026-08-05)

## Market packs (EU / Africa / Asia)

Same job story and confirm-before-write booking flow as the US hero, localized per region. Each pack keeps the write-tool HARD RULE (numbered plan → read-back → explicit yes before `book_appointment` / `request_estimate` / `notify_team`) and the emergency-first handoff.

- EU (`eu-trades-receptionist`): currency EUR (€89 diagnostic, €99 drain, €120 plaster); compliance GDPR only; channels SMS / web / app (+ voice); languages en, de, fr, es, it; emergency 112 + national gas line; card/IBAN/OTP never taken in chat.
- Africa (`africa-trades-receptionist`): WhatsApp-first (primary channel) + SMS / web / app; compliance POPIA + regional privacy; languages en, fr, sw; currency-neutral amounts ("89 (local currency)"); emergency = local emergency services; added mobile-money guardrail — never state a balance or confirm a payment.
- Asia (`asia-trades-receptionist`): channels web / app / SMS; compliance PDPA + regional privacy; languages en, zh, hi; currency-neutral amounts ("89 (local currency)"); emergency = local emergency services; never invent a currency symbol.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
