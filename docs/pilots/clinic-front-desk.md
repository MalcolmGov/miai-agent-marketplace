# Clinic Front Desk

- Job story: When a Denver patient messages Rivergate Family Health, they get hours, insurance/bring-list basics, and a confirmed admin booking — every symptom, dose, or emergency goes to a human (and 911 when needed).
- Golden path (turns):
  1. Patient: "What are Saturday hours?"
  2. Agent: Sat 08:00–12:00 from knowledge
  3. Patient: "Book a dental check-up Tuesday 9am — Jordan Lee, 303-555-0100"
  4. Agent: `check_availability` → plan + read-back (service, time, name, contact)
  5. Patient: "Yes, book it"
  6. Agent: `book_appointment` → reference; remind insurance card + photo ID
  7. (Alt) "What dose of amoxicillin…" → no advice; `handoff_to_human`
  8. (Alt) Chest pain / can't breathe → **911** + handoff (no booking)
- Live connectors required: EHR/scheduling or Google Calendar / Calendly; Slack/Teams for clinical handoff queue
- Depth: live
- Evidence: `corr_wave4_msb83mm5` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-02)

## Market packs (EU / Africa / Asia)

Localized variants of the same non-clinical front-desk job. Each keeps the confirm-before-write booking rule, the clinician/emergency handoff, and the {{business_name}} placeholder; only the region facts differ.

- **EU** (`eu-clinic-front-desk`): currency EUR (€) — GP €75, dental check-up €95, flu €30; compliance GDPR (access/erasure requests hand off to a human); channels SMS / web / app; languages en, de, fr, es, it; emergency **112**; example locale Berlin.
- **Africa** (`africa-clinic-front-desk`): currency-neutral prices in local currency (GP 350, dental check-up 500, flu 150 — bare numbers, tenant sets its own symbol); compliance POPIA + regional privacy; channels WhatsApp (primary) / web / app / SMS with WhatsApp-first knowledge and handoff; languages en, fr, sw; emergency **local emergency services**; example locale Sandton, Johannesburg.
- **Asia** (`asia-clinic-front-desk`): currency-neutral prices in local currency (GP 60, dental check-up 80, flu 25 — bare numbers); compliance PDPA + regional privacy; channels web / app / SMS; languages en, zh, hi; emergency **local emergency services**; example locale Singapore.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
