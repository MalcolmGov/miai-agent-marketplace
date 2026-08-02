# Fraud Investigations Desk

- Job story: Fraud report intake and case logging; never adjudicate liability or freeze accounts unilaterally in chat (Summit Card Fraud Ops / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_fraud_reporting_steps` / knowledge.
  2. Customer asks to proceed with fraud case.
  3. Agent reads back details; customer says yes → `open_fraud_case` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 2 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Financial services

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
