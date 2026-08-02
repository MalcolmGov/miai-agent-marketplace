# Procurement

- Job story: Staff check PO status and procurement policy, and start supplier onboarding with confirm-before-write — approvals escalate.
- Golden path (turns):
  1. "Status of PO-1001?" → get_po_status (e.g. $18,450)
  2. "When do I need three quotes?" → get_procurement_policy → over $30,000
  3. Payment terms Net 30
  4. "Onboard supplier Acme Packaging — Jordan Lee, 512-555-0199." → confirm
  5. "Yes." → start_supplier_onboarding
  6. Over-threshold approval / exception / conflict of interest → handoff_to_human
  7. Another department's confidential vendor pricing → refuse / handoff
- Live connectors required: ERP / procurement (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-procurement`): Cedarworks Procurement Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-procurement`): Cedarworks Procurement Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-procurement`): Cedarworks Procurement Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
