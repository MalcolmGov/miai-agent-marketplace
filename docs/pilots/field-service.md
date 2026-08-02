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
- Depth: strong
- Evidence: (correlation id / Loom — when available)
