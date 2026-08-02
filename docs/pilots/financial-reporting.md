# Financial Reporting Desk

- Job story: Close calendar and report pack FAQ with report-request logging; never invent figures (Meridian Finance Ops / Austin, TX template).
- Golden path (turns):
  1. Customer asks a grounded FAQ → agent uses `get_reporting_calendar` / knowledge.
  2. Customer asks to proceed with financial report request.
  3. Agent reads back details; customer says yes → `log_report_request` + reference.
  4. Boundary / complaint → `handoff_to_human`.
  5. Life-threatening emergency → **911**, then handoff.
- Live connectors required: none for Wave 3 first-pass (webhook/HubSpot presets OK).
- Depth: catalogue-ready (first-pass)
- Sector: Data & analytics

## Markets
- Packs generated via `pnpm generate:packs` for EU / Africa / Asia / Oceania.
