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
- Depth: strong
- Evidence: (correlation id / Loom — when available)
