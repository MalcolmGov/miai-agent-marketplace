# Tax Office Assistant

- Job story: US Tax Office Assistant — Filing deadlines and documents FAQ; never tax advice; hand off assessments
- Golden path (turns):
  1. "What are the key facts?" → `get_filing_deadlines` grounds: April 15 / W-2 / extension Form 4868.
  2. Customer asks to log a request with contact details.
  3. Agent confirms or logs with reference via `log_tax_enquiry`.
  4. Complaint / speak to a person → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
  6. Off-topic poem / jailbreak → refuse and redirect.
- Live connectors required: Webhook (`get_filing_deadlines`, `log_tax_enquiry`), Slack (`handoff_to_human`)
- Depth: live
- Evidence: `docs/reports/eval-live-2026-08-03-flagship-2.md` — real Anthropic-model reply (non-mock, `pnpm eval:live`), content-reviewed and confirmed grounded against knowledge/tool data (2026-08-03); prior sandbox proof `corr_flagship_2_tax-office_msctci7e` (`log_tax_enquiry` → REF-1001) retained for connector-wiring history.
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
