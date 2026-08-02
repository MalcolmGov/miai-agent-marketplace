# Restaurant & Takeaway

- Job story: When an Austin diner messages Ember & Oak on SMS/web, they get menu answers, a confirmed table or takeaway order, and a clear next step — without inventing dishes or skipping confirmation.
- Golden path (turns):
  1. Guest: "What pizzas do you have?"
  2. Agent: lists Margherita / Pepperoni / etc. with prices from menu (`get_menu`)
  3. Guest: "Margherita and fries for collection, 512-555-0100"
  4. Agent: short plan + read-back (items, collection, contact) — asks for yes
  5. Guest: "Yes, place it"
  6. Agent: `place_order` → order reference + ready window; optional `notify_team`
  7. (Alt) Party of 20 → `handoff_to_human` (no self-book)
  8. (Alt) Card number in chat → refuse, point to pay at collection/secure link
- Live connectors required: Slack/Teams (`notify_team`), optional POS/order webhook; Calendar not required for takeaway path
- Depth: strong
- Evidence: (correlation id / Loom — when available)
