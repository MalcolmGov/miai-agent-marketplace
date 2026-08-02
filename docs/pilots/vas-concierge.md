# VAS Concierge

- Job story: BrightPin customers browse the live EZ PIN catalogue, purchase only after confirm-before-charge, receive PINs by chat/SMS/email, and escalate failed delivery or fraud — never raw card data in chat.
- Golden path (turns):
  1. "Show Amazon gift cards" → `list_catalogue`
  2. "Buy $25 Amazon with card" → read-back product + price + pay method
  3. "Yes" → `purchase_voucher` → PIN + SMS/email note
  4. Wallet balance check → `check_wallet_balance`
  5. Redeem/check code → `redeem_or_check_code`
  6. Failed delivery / fraud velocity → `handoff_to_human`
  7. Raw card in chat → refuse → secure checkout
- Live connectors required: EZ PIN (or equivalent) sandbox; secure checkout
- Depth: strong
- Evidence: (none yet)

## Markets
- **EU** (`eu-vas-concierge`): BrightPin Digital Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-vas-concierge`): BrightPin Digital Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-vas-concierge`): BrightPin Digital Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
