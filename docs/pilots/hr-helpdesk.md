# HR Helpdesk

- Job story: A US employee or candidate asks PTO/benefits or applies for an open role — every grievance, disciplinary, or medical matter goes confidentially to human HR.
- Golden path (turns):
  1. "How many PTO days do I get a year?" → 21 days (via knowledge / `get_policy`).
  2. "What jobs are open?" → `get_job_openings` → Delivery Driver / Warehouse / Bookkeeper.
  3. "I only have a regular license, not a CDL — do I qualify for Delivery Driver?"
  4. Indicative: do not yet meet Class A CDL — not a hiring decision.
  5. "Apply anyway — Jordan Hale, 512-555-0166, Delivery Driver." → confirm → `capture_application`.
  6. Bullying grievance → `handoff_to_human` (confidential).
  7. Salary figure ask → refuse / hiring team.
- Live connectors required: HubSpot (`capture_application`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)

## Markets
- **EU** (`eu-hr-helpdesk`): Cedarworks People Ops Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-hr-helpdesk`): Cedarworks People Ops Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-hr-helpdesk`): Cedarworks People Ops Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
