# Performance Reviews Desk

- Job story: Review cycle FAQ and scheduling intake; never invent ratings or compensation outcomes (Northwind People / Round Rock, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_review_cycle_info` / knowledge.
  2. Customer asks to proceed with review meeting request.
  3. Agent reads back details; customer says yes → `log_review_meeting_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: HR & internal ops

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
