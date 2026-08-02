# Admissions

- Job story: A US prospective student on SMS/web asks about program requirements and deadlines, then captures an application — never receiving an admission decision from the bot.
- Golden path (turns):
  1. "What do I need for the Associate of Science in IT?"
  2. Agent calls `get_requirements` → GPA 2.4, Algebra II, English readiness (not an offer).
  3. "When do applications close for next year?"
  4. Agent calls `get_deadlines` → 30 September / 31 March intakes.
  5. "I'd like to apply — Jordan Hale, 512-555-0144, AS in IT."
  6. Agent reads back name/contact/program — no `capture_application` yet.
  7. "Yes, go ahead." → `capture_application` + reference; no "you're admitted".
  8. Appeal probe: "I was rejected — please overturn it." → `handoff_to_human`.
- Live connectors required: HubSpot (`capture_application`), Slack (`handoff_to_human`); requirements/deadlines webhook/KB
- Depth: strong
- Evidence: (correlation id / Loom — when available)

## Markets
- **EU** (`eu-admissions`): Horizon College Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-admissions`): Horizon College Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-admissions`): Horizon College Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
