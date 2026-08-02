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
- Depth: strong
- Evidence: (none yet)
