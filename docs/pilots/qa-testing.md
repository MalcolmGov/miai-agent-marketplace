# QA Testing Assistant

- Job story: Test-case FAQ and defect intake logging; never invent pass/fail for unrun tests (Northwind QA / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_test_plan` / knowledge.
  2. Customer asks to proceed with defect report.
  3. Agent reads back details; customer says yes → `log_defect_report` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: AI & developer tools

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
