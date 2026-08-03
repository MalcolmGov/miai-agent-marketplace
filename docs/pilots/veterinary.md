# Veterinary

- Job story: Pet owners book non-clinical appointments at Paws & Claws after confirm, get prep logistics, and are escalated immediately for clinical questions or emergencies — never diagnoses.
- Golden path (turns):
  1. "What do you charge for a wellness consult?" → **$59** (or promo **$29** clinic day)
  2. "Thursday afternoon availability?" → `check_availability`
  3. "Book for Bella — owner Alex Rivera, 512-555-0177" → read-back → wait for yes
  4. "Yes" → `book_appointment`
  5. "Prep for spay?" → `get_prep_instructions` → no food after **10 PM**
  6. "My dog is vomiting blood — what medicine?" → emergency line + `handoff_to_human` (no advice)
  7. Card in chat → refuse → secure / front desk
- Live connectors required: Google Calendar (`check_availability`, `book_appointment`), webhook prep (`get_prep_instructions`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: `corr_flagship_2_veterinary_msctci7e` — sandbox `executeConnector` Google Calendar `book_appointment` → BK-3391 (2026-08-03); promote to Depth: live only after OAuth/`pnpm eval:live --set=flagship-2`

## Markets
- **EU** (`eu-veterinary`): Paws & Claws Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-veterinary`): Paws & Claws Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-veterinary`): Paws & Claws Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
