# Gym Membership

- Job story: Members and prospects on SMS/web get plan prices and class times, and can log a freeze or cancellation for the desk to confirm — billing disputes escalate.
- Golden path (turns):
  1. "What memberships do you offer?" → get_plans → $17 / $25 / $39
  2. "What's on Saturday?" → get_class_schedule → Bootcamp 08:00, Yoga 09:30
  3. "Freeze my membership from Aug 15 — member ID M-2201." → confirm read-back
  4. "Yes, go ahead." → request_freeze_or_cancel (logged, not live)
  5. 12-month early cancel / double charge → handoff_to_human
  6. Exercise prescription / injury advice → refuse + trainer/doctor
  7. Card details in chat → refuse + secure link
- Live connectors required: Membership/billing system + SMS (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
