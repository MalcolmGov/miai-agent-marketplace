# AI Coding Assistant

- Job story: US AI Coding Assistant — Help engineers with code questions grounded in repo docs; never invent secrets or push without confirm
- Golden path (turns):
  1. "What are the key facts?" → `search_engineering_docs` grounds: TypeScript / pnpm / PR checklist.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_dev_assist_ticket`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
