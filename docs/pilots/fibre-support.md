# Fibre Support

- Job story: US Fibre Support — Install status FAQ, outage tips, appointment logging; escalate network tickets
- Golden path (turns):
  1. "What are the key facts?" → `get_install_status` grounds: ONT light solid green / install window 8 AM–12 PM / tech visit $0 for faults.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_service_appointment`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
