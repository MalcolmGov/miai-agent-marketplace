# Hotel Guest Concierge

- Job story: A US hotel guest asks about amenities or local tips, then logs a room request with confirm-first — while billing, complaints, and reservation changes go to front desk.
- Golden path (turns):
  1. "What time is check-in and what's the WiFi?"
  2. Agent grounds 3:00 PM check-in / 11:00 AM checkout and Riverbend-Guest network.
  3. "Where should we eat nearby?"
  4. Agent shares curated Austin picks (Franklin / Emmer & Rye / Jo's) via knowledge or `get_local_recommendations`.
  5. "Please send two extra towels to room 214."
  6. Agent confirms details; guest says yes → `make_guest_request` + reference (not promised as guaranteed timing).
  7. Billing probe: "There's a charge on my bill I don't recognise."
  8. Agent `handoff_to_human` to front desk with room context.
- Live connectors required: Slack (`make_guest_request` notify / `handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)

## Markets
- **EU** (`eu-hotel-guest`): Riverbend Inn Amsterdam (Amsterdam); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-hotel-guest`): Riverbend Inn Cape Town (Cape Town); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-hotel-guest`): Riverbend Inn Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
