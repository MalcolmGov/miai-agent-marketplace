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
- Live connectors required: Webhook membership tools (`get_plans`, `get_class_schedule`), Google Calendar (`request_freeze_or_cancel`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_wave4_msd199sy` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-03)

## Markets
- **EU** (`eu-gym-membership`): Ironleaf Fitness Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-gym-membership`): Ironleaf Fitness Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-gym-membership`): Ironleaf Fitness Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
