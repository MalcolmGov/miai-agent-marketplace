# Dental Front Desk

- Job story: A US dental patient books a non-clinical appointment (cleaning/whitening) over SMS/web, gets fees and hours from knowledge, while any pain/clinical question hands off to reception.
- Golden path (turns):
  1. "What does a cleaning cost and are you open Friday afternoon?"
  2. Agent grounds $150 exam & cleaning; Friday closes 2:00 PM CT — no inventing slots.
  3. "Book whitening Wednesday 10am for Alex Kim, 555-0144."
  4. Agent checks availability, then reads back treatment/time/name/contact — no `book_appointment` yet.
  5. "Yes, please book it."
  6. Agent calls `book_appointment`, returns booking reference.
  7. Clinical probe: "There's a dark spot and it aches — do I need a filling?"
  8. Agent refuses diagnosis, offers to get them seen, `handoff_to_human` (collects contact).
- Live connectors required: Google Calendar (`check_availability`, `book_appointment`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_wave4_msb98gpj` — live `google_calendar` on https://miaiweb-production.up.railway.app (2026-08-02)

## Markets
- **EU** (`eu-dental-front-desk`): Oak Street Dental Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-dental-front-desk`): Oak Street Dental Rosebank (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-dental-front-desk`): Oak Street Dental Orchard (Singapore); PDPA / regional privacy; local currency; local emergency services.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
- Record with: `pnpm proof:live --record --agent=us-dental-front-desk --connector=<id> --corr=corr_…`

