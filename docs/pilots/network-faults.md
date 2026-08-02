# Network Fault Desk

- Job story: Fault report capture and triage ticket create; never invent SLA promises (ClearLine Fibre / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_known_outages` / knowledge.
  2. Customer asks to proceed with fault ticket.
  3. Agent reads back details; customer says yes → `open_fault_ticket` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Telecommunications

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
