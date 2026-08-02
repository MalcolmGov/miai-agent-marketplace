# Farm Operations Desk

- Job story: US Farm Operations Desk — Farm task and equipment FAQ with work-log capture; escalate safety immediately
- Golden path (turns):
  1. "What are the key facts?" → `get_farm_schedule` grounds: Field 12 / irrigation block B / PPE required.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_farm_work_order`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
