# Fraud Investigations Desk

- Job story: US Fraud Investigations Desk — Fraud report intake and case logging; never adjudicate liability or freeze accounts unilaterally in chat
- Golden path (turns):
  1. "What are the key facts?" → `get_fraud_reporting_steps` grounds: case reference / provisional credit FAQ / no PAN in chat.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `open_fraud_case`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
