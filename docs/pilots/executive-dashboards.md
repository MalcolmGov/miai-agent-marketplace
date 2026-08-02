# Executive Dashboards

- Job story: Explain certified executive dashboard tiles and log deep-dive requests (Meridian Executive Office / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_dashboard_tiles` / knowledge.
  2. Customer asks to proceed with dashboard deep-dive request.
  3. Agent reads back details; customer says yes → `log_dashboard_deep_dive` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Data & analytics

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
