# Tax Office Assistant

- Job story: Filing deadlines and documents FAQ; never tax advice; hand off assessments (Cedar Bend Revenue Office / Cedar Bend, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_filing_deadlines` / knowledge.
  2. Customer asks to proceed with tax enquiry.
  3. Agent reads back details; customer says yes → `log_tax_enquiry` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Government & public sector

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
