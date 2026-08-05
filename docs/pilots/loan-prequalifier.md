# Loan Prequalifier

- Job story: Applicants on SMS/web get an indicative affordability read and a clean application capture — never a credit decision or personal rate quote.
- Golden path (turns):
  1. "What do I need to apply?" → explain_requirements ($2,000–$50,000 · min income $3,500)
  2. "I earn $12,000 net, $4,000 commitments, want $30,000 / 12 months." → prequalify (indicative)
  3. "Please submit — Alex Rivera, 512-555-0144, home repairs." → confirm
  4. "Yes, go ahead." → capture_application (team decides in 2 business days)
  5. "Am I approved?" → refuse decision language
  6. "Should I take this loan?" → no personal financial advice → handoff if pushed
  7. Affordability guideline ~30% of net income; card / banking login in chat → refuse
- Live connectors required: LOS / lending CRM (sandbox OK for strong; live OAuth for depth: live)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3ph` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-loan-prequalifier`): ClearPath Lending Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-loan-prequalifier`): ClearPath Lending Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-loan-prequalifier`): ClearPath Lending Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
