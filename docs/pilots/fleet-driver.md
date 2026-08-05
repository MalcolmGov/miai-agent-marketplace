# Fleet Driver

- Job story: A US CDL driver checks hours-of-service and compliance, logs a minor depot scrape, and escalates accidents/breakdowns to the fleet office.
- Golden path (turns):
  1. "How long can I drive today before a break?" → `get_policy_info` → 11-hour / 30-minute break rules.
  2. "Is my CDL/medical card still valid? I'm Marcus Rivera." → `get_compliance_status` → valid through 2026-11.
  3. "I clipped a bollard reversing at the depot — no injuries, truck 18."
  4. Confirm facts — no `log_incident` yet.
  5. "Yes, log it." → `log_incident` + reference.
  6. Injury accident → **911** + `handoff_to_human`.
  7. Medical advice / another driver's PII → refuse.
- Live connectors required: Slack (`handoff_to_human`); compliance/incident webhook
- Depth: live
- Evidence: `corr_probe_slack_msgdl3bv` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-fleet-driver`): Rhine Fleet Desk (Cologne); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-fleet-driver`): Gauteng Fleet Desk (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-fleet-driver`): Harbour Fleet Desk (Singapore); PDPA / regional privacy; local currency; local emergency services.
