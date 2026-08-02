# Contract Review Intake

- Job story: Matter intake and document checklist; never legal advice; escalate to attorney (Riverstone & Hale Commercial Desk / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_review_checklist` / knowledge.
  2. Customer asks to proceed with contract review intake.
  3. Agent reads back details; customer says yes → `capture_contract_intake` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Professional services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
