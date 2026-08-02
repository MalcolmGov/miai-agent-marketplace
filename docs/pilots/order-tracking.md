# Order Tracking

- Job story: Shoppers on SMS/web get order status and delivery windows, update preferences with confirm-before-write, and escalate refunds or address changes.
- Golden path (turns):
  1. "Where's order NL-4821?" → get_order_status
  2. "What delivery windows do you offer?" → get_delivery_window (e.g. 08:00–12:00)
  3. "Standard delivery cost?" → $3 · free over $42 (knowledge)
  4. "Change my preference to evening — confirm." → update_delivery_preference
  5. Refund / wrong address / damaged → create_ticket + handoff_to_human
  6. No order number → ask first; another customer's order → refuse
  7. Card in chat → refuse + secure checkout
- Live connectors required: Shopify / OMS + ticket desk (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-order-tracking`): Northline Home Goods Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-order-tracking`): Northline Home Goods Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-order-tracking`): Northline Home Goods Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
