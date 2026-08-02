# Executive Dashboards

- Job story: US Executive Dashboards — Explain certified executive dashboard tiles and log deep-dive requests
- Golden path (turns):
  1. "What are the key facts?" → `list_dashboard_tiles` grounds: North Star KPI / weekly exec pack / certified only.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_dashboard_deep_dive`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
