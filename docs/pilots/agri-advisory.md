# Agri Advisory Desk

- Job story: General agronomy programme FAQ and advisory appointment intake; never prescribe pesticides as a vet/agronomist substitute (Prairie Bend Co-op Advisory / Taylor, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_advisory_programmes` / knowledge.
  2. Customer asks to proceed with advisory appointment.
  3. Agent reads back details; customer says yes → `capture_advisory_appointment` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Agriculture

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
