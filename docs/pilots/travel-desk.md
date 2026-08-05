# Travel Desk

- Job story: Meridian staff get policy and destination guidance, capture trip requests after confirm, and never receive live fare quotes or bookings from the agent.
- Golden path (turns):
  1. "Domestic flight class?" → **Economy**
  2. "Per-diem?" → domestic **$75**/day
  3. "London — visa?" → **ETA** on official UK site
  4. "Trip request: NYC 12–15 Oct, Jordan Lee" → read-back → confirm
  5. "Yes" → `capture_trip_request` → **captured** (not booked)
  6. "What's the cheapest fare tomorrow?" → refuse live quote → handoff/team
  7. Card / passport image in chat → refuse → secure path
- Live connectors required: TMC / request queue (sandbox OK for strong)
- Depth: live
- Evidence: `corr_probe_slack_msgdl5ly` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-travel-desk`): Meridian Travel Desk Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-travel-desk`): Meridian Travel Desk Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-travel-desk`): Meridian Travel Desk Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
