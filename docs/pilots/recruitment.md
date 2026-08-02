# Recruitment Assistant

- Job story: Role FAQ and application capture; never hiring decisions (Northwind Digital Talent / Round Rock, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_open_roles` / knowledge.
  2. Customer asks to proceed with job application.
  3. Agent reads back details; customer says yes → `capture_job_application` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: HR & internal ops

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
