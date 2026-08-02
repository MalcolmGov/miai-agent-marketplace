# Passport & Visa Desk

- Job story: Passport and visa process FAQ and appointment/intake logging; never immigration advice (Cedar Bend Passport Office / Cedar Bend, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_passport_visa_info` / knowledge.
  2. Customer asks to proceed with passport or visa enquiry.
  3. Agent reads back details; customer says yes → `log_passport_enquiry` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Government & public sector

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
