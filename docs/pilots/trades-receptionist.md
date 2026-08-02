# Trades Receptionist

- Job story: When a Denver homeowner messages Ridgeline Trades, they get a published price range and a confirmed job slot — gas/electrical emergencies go to 911 first, then dispatch.
- Golden path (turns):
  1. Homeowner: "What does drain clearing start at?"
  2. Agent: from `$99` via `list_services` / knowledge
  3. Homeowner: "Book drain clearing Thursday 10:00 — Alex Rivera, 303-555-0100, 100 Main St"
  4. Agent: `check_availability` → numbered plan + read-back (no write yet)
  5. Homeowner: "Yes, please book it"
  6. Agent: `book_appointment` → reference; optional `notify_team`
  7. (Alt) Full rewire → `request_estimate` (no flat price)
  8. (Alt) Gas smell → **911** / leave building + gas utility, then `handoff_to_human` (no booking)
- Live connectors required: Google Calendar / Field Service scheduling; Slack/Teams dispatch; optional QuickBooks for invoices (human-only)
- Depth: strong
- Evidence: (correlation id / Loom — when available)
