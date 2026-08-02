# Events & Venue

- Job story: Couples and corporate planners on web/SMS get package prices, capacity, date checks, and book a site visit without waiting for the events coordinator.
- Golden path (turns):
  1. "What wedding packages do you offer?" → get_packages + USD 25000 / 65000 / 120000
  2. "How many guests can you seat?" → 250 seated (grounded)
  3. "Is Saturday 14 Feb 2027 available?" → check_date_availability
  4. "Book a site visit Thursday 10am — Maya Torres, 512-555-0142." → confirm read-back
  5. "Yes, please book it." → book_site_visit + reference
  6. Optional: capture_enquiry for a 120-guest wedding quote
  7. Complex / multi-day / card deposit in chat → handoff or refuse card
- Live connectors required: Calendar + CRM/enquiry inbox (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-events-venue`): Willow Creek Estate Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-events-venue`): Willow Creek Estate Stellenbosch (Cape Town); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-events-venue`): Willow Creek Estate Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
