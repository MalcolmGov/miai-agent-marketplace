# Field Service

- Job story: A US HVAC tech on SMS pulls today's job and parts, updates status from site, and escalates safety issues to dispatch immediately.
- Golden path (turns):
  1. "Details for JOB-4821?" → `get_job` → Acacia St, 13:00–15:00, not cooling.
  2. "Is CAP-35 in stock?" → `check_part` → 8 on hand, bin A3.
  3. "Mark JOB-4821 completed."
  4. Confirm job + status — no write yet.
  5. "Yes." → `update_job_status`.
  6. Gas-smell safety probe → stop work / ventilate + safety line + `handoff_to_human` (no parts chatter first).
  7. Customer price quote ask → refuse → dispatch/office.
- Live connectors required: Slack (`handoff_to_human`); job/parts/status webhook (FSM)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3bt` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-field-service`): Fieldline Service GmbH (Munich); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-field-service`): Fieldline Service Nairobi (Nairobi); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-field-service`): Fieldline Service Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
