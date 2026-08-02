# BI Analyst Assistant

- Job story: US BI Analyst Assistant — Explain published metrics and capture analysis requests; never invent numbers
- Golden path (turns):
  1. "What are the key facts?" → `get_metric_definition` grounds: ARR definition / Looker / certified metrics.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_analysis_request`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
