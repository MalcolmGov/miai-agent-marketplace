# Citizen Services

- Job story: US Citizen Services — Hours, forms, where-to-go FAQ; never legal advice; hand off case status
- Golden path (turns):
  1. "What are the key facts?" → `get_service_info` grounds: City Hall Mon–Fri 8:00–16:30 / Form CS-12 / permits counter.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_citizen_enquiry`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: live
- Evidence: `corr_probe_slack_msgdl1g5` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
