# Investment Advisor Intake

- Job story: Intake for advisor introduction and risk questionnaire logging; never personalized investment advice (Summit Investment Desk / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_advisor_process` / knowledge.
  2. Customer asks to proceed with investor intake.
  3. Agent reads back details; customer says yes → `capture_investor_intake` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Financial services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
