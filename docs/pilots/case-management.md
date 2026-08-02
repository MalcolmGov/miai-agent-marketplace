# Legal Case Management

- Job story: Matter status FAQ and document/checklist logging for open cases; never legal advice (Riverstone & Hale Case Desk / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_case_checklist` / knowledge.
  2. Customer asks to proceed with case update request.
  3. Agent reads back details; customer says yes → `log_case_update_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Professional services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
