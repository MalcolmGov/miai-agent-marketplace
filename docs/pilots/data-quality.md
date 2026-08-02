# Data Quality Desk

- Job story: Data-quality issue FAQ and incident logging; never silently fix production data (Meridian Data Platform / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_dq_rules` / knowledge.
  2. Customer asks to proceed with data quality issue.
  3. Agent reads back details; customer says yes → `log_data_quality_issue` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Data & analytics

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
