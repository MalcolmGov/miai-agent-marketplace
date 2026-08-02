# Credit Card Desk

- Job story: Card product FAQ and dispute intake routing; PCI — no PAN in chat (Summit Card Services / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_card_products` / knowledge.
  2. Customer asks to proceed with card dispute intake.
  3. Agent reads back details; customer says yes → `log_card_dispute_intake` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 1 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Financial services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
