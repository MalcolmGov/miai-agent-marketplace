# Energy Operations Desk

- Job story: Outage and service FAQ plus work-order logging for energy customers; never invent restoration ETAs (Hill Country Energy / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_outage_status` / knowledge.
  2. Customer asks to proceed with energy service request.
  3. Agent reads back details; customer says yes → `log_energy_service_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Energy & utilities

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
