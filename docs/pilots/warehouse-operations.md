# Warehouse Operations

- Job story: Pick/pack/location FAQ and exception logging for warehouse staff (Meridian Fulfillment DC-Austin / Round Rock, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `lookup_bin_location` / knowledge.
  2. Customer asks to proceed with warehouse exception.
  3. Agent reads back details; customer says yes → `log_warehouse_exception` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Manufacturing & industrial

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
