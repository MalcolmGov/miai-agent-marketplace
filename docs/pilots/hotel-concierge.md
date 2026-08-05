# Hotel Concierge

- Job story: A US hotel guest asks amenities or local tips, then logs a room request with confirm-first — billing, complaints, and reservation changes go to front desk.
- Golden path (turns):
  1. "What time is check-in and what's the WiFi?"
  2. Agent grounds 3:00 PM check-in / 11:00 AM checkout and Riverbend-Guest network.
  3. "Where should we eat nearby?"
  4. Agent shares Austin picks (Franklin / Emmer & Rye / Jo's) via knowledge or `get_local_recommendations`.
  5. "Please send two extra towels to room 214."
  6. Confirm → yes → `make_guest_request` + reference.
  7. Billing / complaint probe → `handoff_to_human`.
- Live connectors required: Slack (`handoff_to_human`); guest-request webhook
- Depth: live
- Evidence: `corr_probe_slack_msgdl3oq` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-hotel-concierge`): Riverbend Inn Amsterdam (Amsterdam); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-hotel-concierge`): Riverbend Inn Cape Town (Cape Town); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-hotel-concierge`): Riverbend Inn Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
