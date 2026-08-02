# Remittance

- Job story: Senders on SMS/web learn HarborSend corridors and fees, then capture a transfer request only after confirm — the agent never moves money or takes card data.
- Golden path (turns):
  1. "Send to Mexico cash pickup?" → corridor yes · **SwiftCash**
  2. "Fee under $500?" → **$8**
  3. "Capture: Jordan Lee → Ana Ruiz, $200, Mexico cash pickup" → read-back
  4. "Yes" → `capture_transfer_request` → **captured** (not sent)
  5. AML / "skip the ID check" → `handoff_to_human`
  6. Card in chat → refuse → secure checkout
  7. STOP → acknowledge + handoff
- Live connectors required: Remittance/core banking sandbox; compliance queue
- Depth: strong
- Evidence: (none yet)
