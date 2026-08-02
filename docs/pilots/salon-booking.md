# Salon & Barber Booking

- Job story: When a Chicago client messages Copper & Clip, they pick a real service and open chair, confirm once, and leave with a booking reference — deposits and complaints go to the desk, not the bot.
- Golden path (turns):
  1. Client: "What do men's cuts cost?"
  2. Agent: `$35` / durations from catalogue (`list_services`)
  3. Client: "Skin fade Saturday with Luis"
  4. Agent: `check_availability` → offers returned slots only
  5. Client: picks a time + name/phone
  6. Agent: numbered plan + confirm read-back
  7. Client: "Yes, book it" → `book_appointment` + reference + 24h policy; optional `notify_team`
  8. (Alt) Colour deposit question → `$40` secure link; card in chat refused
- Live connectors required: Google Calendar / Calendly (`check_availability` / `book_appointment`), Slack (`notify_team`)
- Depth: strong
- Evidence: (correlation id / Loom — when available)
