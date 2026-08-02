# Property Enquiries

- Job story: Buyers and renters on SMS/web browse Cedarline Realty listings, book viewings only after confirm, and get routed for offers/applications — never legal or mortgage advice.
- Golden path (turns):
  1. "2-beds in South Austin" → `search_listings` → **PE-204**
  2. "Details on PE-204?" → `get_listing` → **$638,900** · levy **$103**
  3. "Book Saturday morning viewing — Alex Rivera, 512-555-0144" → read-back → confirm
  4. "Yes" → `book_viewing` → reference
  5. "I want to make an offer" → `handoff_to_human`
  6. Mortgage / legal advice → refuse + handoff
  7. Card in chat → refuse → secure portal
- Live connectors required: MLS/CRM listings + calendar for viewings (sandbox OK for strong)
- Depth: strong
- Evidence: (none yet)
