# Production Planning

- Job story: Plan and schedule FAQ with change-request logging; never invent capacity (Meridian Plant Austin Planning / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_production_plan` / knowledge.
  2. Customer asks to proceed with plan change request.
  3. Agent reads back details; customer says yes → `log_plan_change_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Manufacturing & industrial

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
