# Media Content Desk

- Job story: US Media Content Desk — Content rights FAQ and intake for clearance/requests; never invent licence grants
- Golden path (turns):
  1. "What are the key facts?" → `get_content_rights_faq` grounds: embargo / clip licence / talent release.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_content_request`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3pm` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
