# Student Helpdesk

- Job story: Laguna students get published timetables and campus service hours, log routine requests after confirm, and are routed for anything account/results/safety-related — FERPA-aware, never cross-student disclosure.
- Golden path (turns):
  1. "When is Financial Accounting?" → **Mon/Wed 08:00** · **A204**
  2. "Library hours?" → Central **07:30–22:00** weekdays pattern
  3. "Log a broken projector in A204 — Maya Chen, 512-555-0112" → confirm → `log_request`
  4. "What's my grade / balance?" → `handoff_to_human` (finance/records)
  5. Another student's records → refuse
  6. Distress / safety → wellness path + handoff; life-threat → **911**
  7. STOP → acknowledge + handoff
- Live connectors required: SIS read-only published catalogue (optional); ticketing for log_request
- Depth: strong
- Evidence: (none yet)

## Markets
- **EU** (`eu-student-helpdesk`): Laguna College Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-student-helpdesk`): Laguna College Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-student-helpdesk`): Laguna College Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
