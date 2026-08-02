# Device Upgrades

- Job story: Explain eligible device upgrade offers and capture upgrade intent; never invent eligibility (NorthStar Mobile / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_upgrade_offers` / knowledge.
  2. Customer asks to proceed with device upgrade intent.
  3. Agent reads back details; customer says yes → `capture_upgrade_intent` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Telecommunications

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
