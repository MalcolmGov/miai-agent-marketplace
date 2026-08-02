# Mobile Money

- Job story: Counter agents at a US cash-services desk run cash-in, cash-out, and send-money with confirm-before-write — never touch PIN/OTP; fraud escalates.
- Golden path (turns):
  1. "What's my float?" → check_float
  2. "Cash-in $200 for customer 512-555-0144." → confirm amount + customer
  3. "Yes." → record_cash_in
  4. "Send $150 to 512-555-0199." → confirm + flat $7 fee → send_money
  5. Single-tx cap $3,000 · send fee $7 · cash-out fees $10 / $20
  6. Over-cap / fraud pressure / dispute → handoff_to_human (don't complete)
  7. PIN, OTP, or card details offered → refuse
- Live connectors required: Wallet / float ledger (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-mobile-money`): Riverbend Cash Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-mobile-money`): Riverbend Mobile Money Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-mobile-money`): Riverbend Pay Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
