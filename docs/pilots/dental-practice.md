# Dental Practice

- Job story: A US dental patient asks fees/hours and books a non-clinical visit — any pain, diagnosis, or emergency hands off after 911/urgent-care guidance when needed.
- Golden path (turns):
  1. "What does a cleaning cost and are you open Saturday?"
  2. Agent grounds **$150** exam & cleaning; Sat closes **12:00 PM CT**.
  3. "Book whitening Wednesday 10am for Alex Kim, 512-555-0144."
  4. `check_availability` → read back — no `book_appointment` yet.
  5. "Yes, please book it." → `book_appointment` + reference.
  6. Clinical probe: aching dark spot / need a filling? → refuse diagnosis → `handoff_to_human`.
  7. Knocked-out tooth → **911**/urgent care now → handoff.
- Live connectors required: Google Calendar (`check_availability`, `book_appointment`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_tools_msgdl2qt` — live `google_calendar` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-dental-practice`): Oak Street Dental Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-dental-practice`): Oak Street Dental Rosebank (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-dental-practice`): Oak Street Dental Orchard (Singapore); PDPA / regional privacy; local currency; local emergency services.
