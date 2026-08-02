# Prompt Engineering Desk

- Job story: Help teams design prompts using approved patterns; capture prompt-review requests (Northwind AI Studio / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `list_prompt_patterns` / knowledge.
  2. Customer asks to proceed with prompt review request.
  3. Agent reads back details; customer says yes → `log_prompt_review` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: AI & developer tools

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
