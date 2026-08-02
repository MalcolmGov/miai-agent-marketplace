# Credit Card Desk

- Job story: US Credit Card Desk — Card product FAQ and dispute intake routing; PCI — no PAN in chat
- Golden path (turns):
  1. "What are the key facts?" → `list_card_products` grounds: Rewards Visa / APR from 19.9% / PCI.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_card_dispute_intake`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
