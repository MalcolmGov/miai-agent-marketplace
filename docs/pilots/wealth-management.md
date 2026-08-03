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
- Evidence: `docs/reports/eval-live-2026-08-03-flagship-2.md` — real Anthropic-model reply (non-mock, `pnpm eval:live`), content-reviewed and confirmed grounded against knowledge/tool data (2026-08-03); prior sandbox proof `corr_flagship_2_wealth-management_msctci7e` (`capture_wealth_meeting` → APP-4821) retained for connector-wiring history.
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
