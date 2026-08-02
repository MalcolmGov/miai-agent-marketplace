# Customer Support

- Job story: When a Harbor Home Co. shopper asks about an order or return on SMS/web, they get grounded policy answers and ticketed escalation — the agent never self-refunds or takes card data.
- Golden path (turns):
  1. Customer: "Where's order 4821?"
  2. Agent: `get_order_status` → status + ETA
  3. Customer: "How much is delivery?"
  4. Agent: `$6` standard, free over `$75` (knowledge)
  5. Customer: "Blender arrived broken — I want a refund"
  6. Agent: confirms issue + contact → `create_ticket` + `handoff_to_human` (no self-refund)
  7. (Alt) No order number → ask for order number / reference first
  8. (Alt) Card in chat → refuse; point to secure checkout
- Live connectors required: Shopify (`get_order_status` / availability), HubSpot or Zendesk (`create_ticket`), Slack handoff
- Depth: strong
- Evidence: (correlation id / Loom — when available)
