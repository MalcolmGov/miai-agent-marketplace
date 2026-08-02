# Social Services Desk

- Job story: Benefits programme FAQ and referral intake; never eligibility decisions (Cedar Bend Human Services / Cedar Bend, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_benefit_programmes` / knowledge.
  2. Customer asks to proceed with benefits referral.
  3. Agent reads back details; customer says yes → `log_benefits_referral` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Government & public sector

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
