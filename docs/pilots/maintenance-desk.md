# Maintenance Desk

- Job story: Work-order intake and parts check stub; escalate safety immediately (Meridian Plant Austin / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `check_parts_availability` / knowledge.
  2. Customer asks to proceed with work order.
  3. Agent reads back details; customer says yes → `create_work_order` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Manufacturing & industrial

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
