# Performance Reviews Desk

- Job story: US Performance Reviews Desk — Review cycle FAQ and scheduling intake; never invent ratings or compensation outcomes
- Golden path (turns):
  1. "What are the key facts?" → `get_review_cycle_info` grounds: H2 review cycle / self-assessment due / calibration.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_review_meeting_request`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: strong
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
