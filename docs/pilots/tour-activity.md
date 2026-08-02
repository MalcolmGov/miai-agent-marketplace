# Tour Activity

- Job story: Guests browse Hill Country Trails offerings, check availability, and book only after confirm — payments via secure link; complaints/custom groups go to the desk.
- Golden path (turns):
  1. "What tours do you have?" → hike **$45** · paddle **$65** · winery **$95**
  2. "Greenbelt this Thursday?" → availability tool
  3. "Book for 2 — Priya Shah, 512-555-0188" → read-back → confirm
  4. "Yes" → `book_tour`
  5. Cancellation policy → free until **24 hours** before
  6. Complaint / refund → `handoff_to_human`
  7. Card in chat → refuse
- Live connectors required: Booking calendar / Peek or FareHarbor-style API (sandbox OK for strong)
- Depth: strong
- Evidence: (none yet)
