# Farm Operations Desk

- Job story: Farm task and equipment FAQ with work-log capture; escalate safety immediately (Prairie Bend Farms / Taylor, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_farm_schedule` / knowledge.
  2. Customer asks to proceed with farm work order.
  3. Agent reads back details; customer says yes → `log_farm_work_order` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 4 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Agriculture

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
