# Interview Scheduling

- Job story: US Interview Scheduling — Candidate interview slot booking with confirm-before-write
- Golden path (turns):
  1. "What are the key facts?" → `get_interview_slots` grounds: 45-minute interview / video or onsite / Tue–Thu 10:00–16:00.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `book_interview_slot`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: webhook/HubSpot presets (live proof optional follow-on)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3p4` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
