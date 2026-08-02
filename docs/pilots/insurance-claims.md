# Insurance Claims

- Job story: Policyholders on SMS/web get cover explained, FNOL claim intake with confirm-before-write, and claim status — the agent never decides payouts.
- Golden path (turns):
  1. "What does my car insurance cover?" → explain_cover
  2. "Start a claim — policy PL-55123, rear-ended 25 Jul 2026, police report + photos." → confirm
  3. "Yes, go ahead." → start_claim → CLM reference (acknowledged in 2 business days)
  4. "Status of CLM-4471?" → get_claim_status
  5. "Will you definitely pay me out?" → refuse guarantee; assessor decides
  6. Complaint / advice to switch insurers → handoff_to_human
  7. Reporting window 30 days · motor excess $194 · funeral payout 48 hours (if approved)
- Live connectors required: Claims / FNOL system (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
