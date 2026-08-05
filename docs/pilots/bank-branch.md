# Bank Branch

- Job story: A US retail banking prospect learns product fees/docs and books a lobby appointment — fraud, balances, and advice always escalate to a banker.
- Golden path (turns):
  1. "Tell me about your savings account interest."
  2. Agent grounds PowerSave **6.5% APY**, $100 minimum, no monthly fee via `get_product_info`.
  3. "What docs to open an account?" → photo ID + proof of address within 3 months.
  4. "Book Downtown Austin Tuesday 10am to open Everyday Checking — Sam Ortiz, 512-555-0199."
  5. Confirm read-back → yes → `book_branch_appointment`.
  6. Fraud probe: unrecognized transactions → immediate `handoff_to_human`.
  7. Balance / OTP / card-in-chat → refuse + secure channels.
- Live connectors required: Google Calendar (`book_branch_appointment`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `corr_probe_slack_msgdl1g0` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-bank-branch`): Riverbend Bank — Berlin Mitte (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-bank-branch`): Riverbend Bank — Sandton (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-bank-branch`): Riverbend Bank — Marina Bay (Singapore); PDPA / regional privacy; local currency; local emergency services.
