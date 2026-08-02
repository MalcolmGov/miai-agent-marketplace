# SIM Registration

- Job story: RICA/KYC-style SIM register intake with confirm-before-submit; hand off ID disputes (NorthStar Mobile / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_registration_requirements` / knowledge.
  2. Customer asks to proceed with SIM registration.
  3. Agent reads back details; customer says yes → `submit_sim_registration` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Telecommunications

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
