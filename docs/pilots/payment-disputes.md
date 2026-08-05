# Payment Disputes

- Job story: Customers raise card/ACH disputes with evidence capture and confirm-before-write — the agent never decides chargebacks or issues refunds.
- Golden path (turns):
  1. "How do I dispute a duplicate charge?" → get_dispute_process
  2. "Open a dispute — order NL-4821, charged twice on 20 Jul, last4 4242." → confirm
  3. "Yes, go ahead." → open_dispute (reference)
  4. "Status of DSP-2201?" → get_dispute_status
  5. Window 120 days · resolution up to 45 days · ack in 2 business days
  6. Fraud / chargeback decision demand → handoff_to_human
  7. Full card / CVV / PIN in chat → refuse (last 4 only)
- Live connectors required: Payments / dispute queue (sandbox OK for strong; live OAuth for depth: live)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3q5` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-payment-disputes`): Northline Payments Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-payment-disputes`): Northline Payments Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-payment-disputes`): Northline Payments Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
