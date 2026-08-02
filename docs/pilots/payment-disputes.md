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
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
