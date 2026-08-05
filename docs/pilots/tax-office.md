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
- Evidence: `corr_probe_slack_msgdl4vy` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Sector: from catalogue Industry filter

## Markets
- Packs: US / EU / Africa / Asia / Oceania via `pnpm generate:packs` after deepen.
