# Spaza Merchant

- Job story: Cesar Corner Market's owner checks shelf prices, logs sales and credit-book entries, and places wholesaler reorders — every write only after confirm; disputes go to a human.
- Golden path (turns):
  1. "Price on 2L Coke?" → `check_price`
  2. "Record sale: 2× bread, 1× soap" → read-back → confirm → `record_sale`
  3. "Put $50 credit for Sipho" → read-back → confirm → `credit_book`
  4. "Reorder 10 cases water" → flag if under **$500** minimum · confirm → `reorder_stock`
  5. Wholesaler days → **Tuesday / Friday** · cut-off **16:00**
  6. Credit dispute → `handoff_to_human`
  7. Card in chat → refuse
- Live connectors required: POS / inventory + wholesaler order API (sandbox OK for strong)
- Depth: live
- Evidence: `corr_probe_slack_msgdl4vu` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)
- Note: US SME framing of the counter-trade / credit-book job (bodega / corner market); Africa market packs remain separate.

## Markets
- **EU** (`eu-spaza-merchant`): Corner Kiosk Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-spaza-merchant`): Cesar Spaza — Soweto (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-spaza-merchant`): Cesar Convenience — Jurong (Singapore); PDPA / regional privacy; local currency; local emergency services.
