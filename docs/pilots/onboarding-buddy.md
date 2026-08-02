# Onboarding Buddy

- Job story: New joiners on SMS/web get a day-by-day week-one checklist, resource links, and a logged People-team question when stuck — blockers and HR escalate to a human.
- Golden path (turns):
  1. "What's on my checklist today?" → get_onboarding_checklist (access card, MFA, buddy)
  2. "I'm a Support Analyst — first week?" → role-tailored checklist
  3. "Where do I submit banking/tax?" → Self-Service portal (never take details in chat)
  4. "What time / where on day one?" → 08:30, reception 3rd floor
  5. "Log a parking question for People — I'm Aisha." → confirm → log_question + REF
  6. Laptop won't boot / contract salary mismatch → handoff_to_human
  7. Card details in chat → refuse + portal
- Live connectors required: HRIS / Slack or email notify (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-onboarding-buddy`): Ridgeway Labs Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-onboarding-buddy`): Ridgeway Labs Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-onboarding-buddy`): Ridgeway Labs Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
