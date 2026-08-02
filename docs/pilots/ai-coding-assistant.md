# AI Coding Assistant

- Job story: Help engineers with code questions grounded in repo docs; never invent secrets or push without confirm (Northwind Engineering / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `search_engineering_docs` / knowledge.
  2. Customer asks to proceed with engineering assist ticket.
  3. Agent reads back details; customer says yes → `log_dev_assist_ticket` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: AI & developer tools

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
