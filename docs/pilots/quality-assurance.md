# Quality Assurance Desk

- Job story: Nonconformance report capture; never invent pass/fail decisions (Meridian Plant Austin QA / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_qa_checklist` / knowledge.
  2. Customer asks to proceed with nonconformance report.
  3. Agent reads back details; customer says yes → `log_nonconformance` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Manufacturing & industrial

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
