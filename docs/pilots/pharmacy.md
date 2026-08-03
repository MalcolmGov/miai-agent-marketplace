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
- Live connectors required: Shopify (`check_stock`), webhook PMS (`get_script_status`, `log_refill_request`), Slack (`handoff_to_human`)
- Depth: strong
- Evidence: `corr_flagship_1a_pharmacy_mscqcwrr` — sandbox `executeConnector` Shopify `check_stock` (2026-08-03); OAuth live + `pnpm eval:live --set=flagship-1a` when keys present

## Markets
- **EU** (`eu-pharmacy`): Riverside Community Pharmacy Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-pharmacy`): Riverside Community Pharmacy Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-pharmacy`): Riverside Community Pharmacy Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
