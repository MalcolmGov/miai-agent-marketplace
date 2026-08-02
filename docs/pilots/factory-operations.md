# Factory Operations

- Job story: Shift and line status FAQ plus production exception logging for plant staff (Meridian Plant Austin / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_line_status` / knowledge.
  2. Customer asks to proceed with production exception.
  3. Agent reads back details; customer says yes → `log_production_exception` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Manufacturing & industrial

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
