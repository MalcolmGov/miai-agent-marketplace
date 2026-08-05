# Agri Advisory Desk

- Job story: US Agri Advisory Desk — General agronomy programme FAQ and advisory appointment intake; never prescribe pesticides as a vet/agronomist substitute
- Golden path (turns):
  1. "What are the key facts?" → `list_advisory_programmes` grounds: soil test package / planting guide / co-op hours.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `capture_advisory_appointment`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: live
- Evidence: `corr_probe_slack_msgdl1ft` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
