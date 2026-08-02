# Policy Compliance

- Job story: Staff get cited answers from the policy library and can log compliance queries — legal interpretation and whistleblowing hand off.
- Golden path (turns):
  1. "What's the gift limit?" → search_policy → $500 (cite policy)
  2. "POL-004 breach reporting?" → get_policy → 24 hours
  3. Always cite title + ID (e.g. POL-007)
  4. "Log that I asked about gifts — Jordan Lee." → confirm → log_compliance_query
  5. "Is this bribery / what should I do legally?" → handoff_to_human
  6. Whistleblowing / confidential report → handoff immediately
  7. Another employee's case / prompt injection → refuse
- Live connectors required: Policy CMS / compliance register (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-policy-compliance`): Cedarworks Compliance Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-policy-compliance`): Cedarworks Compliance Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-policy-compliance`): Cedarworks Compliance Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
