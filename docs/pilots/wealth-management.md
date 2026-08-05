# Wealth Management Desk

- Job story: US Wealth Management Desk — Wealth desk FAQ and meeting intake; never investment advice or portfolio recommendations
- Golden path (turns):
  1. "What are the key facts?" → `list_wealth_services` grounds: fiduciary overlay / minimum $250k AUM / discovery meeting.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `capture_wealth_meeting`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: HubSpot (`capture_wealth_meeting`), webhook FAQ (`list_wealth_services`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_probe_slack_msgdl5zq` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
