# Tax Office Assistant

- Job story: US Tax Office Assistant — Filing deadlines and documents FAQ; never tax advice; hand off assessments
- Golden path (turns):
  1. "What are the key facts?" → `get_filing_deadlines` grounds: April 15 / W-2 / extension Form 4868.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_tax_enquiry`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
