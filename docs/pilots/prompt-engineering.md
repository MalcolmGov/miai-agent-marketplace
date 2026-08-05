# Prompt Engineering Desk

- Job story: US Prompt Engineering Desk — Help teams design prompts using approved patterns; capture prompt-review requests
- Golden path (turns):
  1. "What are the key facts?" → `list_prompt_patterns` grounds: system vs user / eval harness / guardrail checklist.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_prompt_review`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: live
- Evidence: `corr_probe_slack_msgdl43d` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
