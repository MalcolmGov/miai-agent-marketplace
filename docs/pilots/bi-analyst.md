# BI Analyst Assistant

- Job story: Explain published metrics and capture analysis requests; never invent numbers (Meridian Insights / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_metric_definition` / knowledge.
  2. Customer asks to proceed with analysis request.
  3. Agent reads back details; customer says yes → `log_analysis_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Data & analytics

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
