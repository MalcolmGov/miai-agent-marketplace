# Wealth Management Desk

- Job story: Wealth desk FAQ and meeting intake; never investment advice or portfolio recommendations (Summit Wealth Advisory / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_wealth_services` / knowledge.
  2. Customer asks to proceed with wealth meeting request.
  3. Agent reads back details; customer says yes → `capture_wealth_meeting` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Financial services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
