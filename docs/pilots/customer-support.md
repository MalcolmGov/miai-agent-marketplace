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

## Market packs (EU / Africa / Asia)

Localized variants of the same job story. Each keeps the confirm-before-write hard rule and the refund/complaint handoff; only region facts change.

- **EU** (`eu-customer-support`): currency €/EUR (delivery flat €6, free over €75); compliance GDPR (access/erasure → handoff); channels SMS/web/app; languages en/de/fr/es/it; emergencies → 112. Adds the EU right of withdrawal (14 days) and the 2-year statutory guarantee; example tenant Casa Verde Home, Amsterdam.
- **Africa** (`africa-customer-support`): currency-neutral amounts (delivery flat 6, free over 75 in local currency — no hardcoded symbol); compliance POPIA + regional privacy; channels WhatsApp (primary)/web/app/SMS; languages en/fr/sw; emergencies → local emergency services. WhatsApp is the lead channel for support, tracking, and handoff; payments include mobile money (M-Pesa); example tenant Umoya Home, Nairobi.
- **Asia** (`asia-customer-support`): currency-neutral amounts (delivery flat 6, free over 75 in local currency); compliance PDPA + regional privacy; channels web/app/SMS; languages en/zh/hi; emergencies → local emergency services. Payments include PayNow; example tenant Lotus Home, Singapore.
