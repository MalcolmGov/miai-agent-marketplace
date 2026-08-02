# Citizen Services

- Job story: Hours, forms, where-to-go FAQ; never legal advice; hand off case status (City of Cedar Bend Citizen Portal / Cedar Bend, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_service_info` / knowledge.
  2. Customer asks to proceed with citizen enquiry.
  3. Agent reads back details; customer says yes → `log_citizen_enquiry` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Government & public sector

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
