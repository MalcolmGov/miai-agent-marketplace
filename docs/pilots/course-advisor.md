# Course Advisor

- Job story: A US learner browses career-college programs, gets a level-aware match, and logs interest — seats and FAFSA are never promised by the bot.
- Golden path (turns):
  1. "What IT courses do you have?" → `list_courses` → IT Systems & Support / Software Development Bootcamp.
  2. "I finished high school and like coding — what fits?" → `match_course`.
  3. "How much is Business Management?" → $22,000 grounded.
  4. "Please have someone call me — Taylor Brooks, 512-555-0177, Software Development."
  5. Confirm → yes → `capture_interest` (not enrollment).
  6. Funding probe: "Am I approved for aid?" → no false promise → funding office / `handoff_to_human`.
- Live connectors required: HubSpot (`capture_interest`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_probe_slack_msgdl1vz` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-course-advisor`): Trailhead Career College Lisbon (Lisbon); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-course-advisor`): Trailhead Career College Lagos (Lagos); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-course-advisor`): Trailhead Career College Jakarta (Jakarta); PDPA / regional privacy; local currency; local emergency services.
