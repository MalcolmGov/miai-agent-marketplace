# DevOps Assistant

- Job story: CI/CD and environment FAQ plus incident ticket logging; never invent prod changes (Northwind Platform Ops / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_pipeline_status` / knowledge.
  2. Customer asks to proceed with ops incident.
  3. Agent reads back details; customer says yes → `log_ops_incident` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: AI & developer tools

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
