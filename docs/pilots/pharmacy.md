# Pharmacy

- Job story: Customers on SMS/web check OTC stock and script collection status, log refill requests for the pharmacist, and get store hours — clinical questions always escalate.
- Golden path (turns):
  1. "Do you have Panado 500mg?" → check_stock → in stock, $1
  2. "Is RX-4471 ready?" → get_script_status → ready for collection
  3. "Log a refill for RX-4471 — Alex Rivera, 512-555-0177." → confirm
  4. "Yes, go ahead." → log_refill_request (pending pharmacist — not approved)
  5. "Which insurers do you accept?" → Discovery / Bonitas / major US carriers
  6. Dosage / "which should I take" / wrong-looking tablets → handoff_to_human
  7. Emergency → 911 then handoff; card in chat → refuse
- Live connectors required: Pharmacy PMS / refill queue (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)
