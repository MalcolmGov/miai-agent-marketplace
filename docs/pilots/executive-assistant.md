# Executive Assistant

- Job story: A US executive (or their trusted ops contact) texts or chats to check availability, schedule a meeting with confirm-first, set a reminder, and notify the team — without exposing private details.
- Golden path (turns):
  1. "What's on my calendar tomorrow?"
  2. Agent calls `check_calendar` and summarizes free blocks inside 8:00 AM–5:00 PM CT.
  3. "Set up a 30-min budget review with Priya and Marcus tomorrow at 2:00 PM, remind me, and notify the team."
  4. Agent states the plan (check → schedule → reminder → notify) and reads details back — no write yet.
  5. "Yes — please set it up."
  6. Agent runs `schedule_meeting`, `set_reminder`, `notify_team`, returns references.
  7. Conflict probe: "I'm double-booked at 2:00 and can't decide which to drop."
  8. Agent hands off via `handoff_to_human` with a summary (does not silently drop a meeting).
- Live connectors required: Google Calendar (`check_calendar`, `schedule_meeting`), Slack (`notify_team`, `handoff_to_human`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)

## Markets
- **EU** (`eu-executive-assistant`): Maya Chen / Ridgeway Labs Berlin EA desk (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-executive-assistant`): Maya Chen / Ridgeway Labs Johannesburg EA desk (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-executive-assistant`): Maya Chen / Ridgeway Labs Singapore EA desk (Singapore); PDPA / regional privacy; local currency; local emergency services.
