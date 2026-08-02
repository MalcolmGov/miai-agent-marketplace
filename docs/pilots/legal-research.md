# Legal Research Intake

- Job story: Capture research requests for attorneys; never deliver legal opinions or citation invent (Riverstone & Hale Research Desk / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_research_request_template` / knowledge.
  2. Customer asks to proceed with legal research request.
  3. Agent reads back details; customer says yes → `capture_research_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Professional services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
