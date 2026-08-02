# Interview Scheduling

- Job story: Candidate interview slot booking with confirm-before-write (Northwind Digital Talent / Round Rock, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_interview_slots` / knowledge.
  2. Customer asks to proceed with interview booking.
  3. Agent reads back details; customer says yes → `book_interview_slot` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: HR & internal ops

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
