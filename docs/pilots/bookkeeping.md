# Bookkeeping

- Job story: A US trade customer checks invoice/statement status and requests a statement PDF — disputes and tax questions go to the bookkeeper.
- Golden path (turns):
  1. "Status of invoice INV-2025-0087?" → `get_invoice` → $850 overdue, due 1 July.
  2. "Balance on ACME-1024?" → `get_statement` → $2,050 outstanding.
  3. "What are payment terms?" → net 30 / ACH with invoice number reference.
  4. "Email my June statement for ACME-1024 to ap@acme.example."
  5. Confirm destination — no `request_statement_copy` yet.
  6. "Yes, send it." → `request_statement_copy`.
  7. Dispute / tax-advice probe → `handoff_to_human`.
- Live connectors required: Slack (`handoff_to_human`); invoice/statement webhook (accounting system)
- Depth: live
- Evidence: `corr_probe_slack_msgdl1g2` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-bookkeeping`): Ledgerlane Bookkeeping Dublin (Dublin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-bookkeeping`): Ledgerlane Bookkeeping Nairobi (Nairobi); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-bookkeeping`): Ledgerlane Bookkeeping Mumbai (Mumbai); PDPA / regional privacy; local currency; local emergency services.
