# Contract Review Intake

- Job story: US Contract Review Intake — Matter intake and document checklist; never legal advice; escalate to attorney
- Golden path (turns):
  1. "What are the key facts?" → `get_review_checklist` grounds: NDA / MSA / intake only.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `capture_contract_intake`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
