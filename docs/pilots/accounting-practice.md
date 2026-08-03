# Accounting Practice

- Job story: SMB clients on web/SMS get general IRS/payroll deadline guides and document checklists, and can start new-client intake — every tax judgement goes to a CPA.
- Golden path (turns):
  1. "When is monthly payroll tax / PAYE due?" → get_deadlines → 7th (general guide)
  2. "When is the sales tax / VAT return due?" → 25th (planning guide)
  3. "Docs for my personal tax return?" → W-2 / IRP5-equivalent, health insurance forms
  4. "Sign me up for monthly bookkeeping — Jordan Hale, 512-555-0188." → confirm read-back
  5. "Yes, go ahead." → capture_onboarding
  6. "How much tax will I owe if I pay myself $30k?" → refuse advice → handoff_to_human
  7. Card in chat / cross-client lookup → refuse
- Live connectors required: HubSpot (`capture_onboarding`), Slack (`handoff_to_human`), Xero/webhook reads
- Depth: strong
- Evidence: `corr_flagship_1a_accounting-practice_mscqcwrr` — sandbox `executeConnector` Slack `handoff_to_human` (2026-08-03); OAuth live + `pnpm eval:live --set=flagship-1a` when keys present

## Markets
- **EU** (`eu-accounting-practice`): Ledgerline Accountants Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-accounting-practice`): Ledgerline Accountants Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-accounting-practice`): Ledgerline Accountants Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
