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
- Depth: live
- Evidence: `corr_wave4_msgcbfz8` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Market packs (EU / Africa / Asia)

Same Ember & Oak job story and tools as the US hero, localized per region. Confirm-before-write and kitchen handoff are identical across all packs.

- **EU** (`eu-restaurant-takeaway`): currency EUR (€, numbers preserved — €14 Margherita, €16 burger, €4 delivery fee, free over €45); compliance GDPR (access/erasure → human handoff); channels SMS / web / app; languages en, de, fr, es, it; emergency 112; Berlin example tenant with +49 phone norm and EU allergen-info (Reg. 1169/2011) wording.
- **Africa** (`africa-restaurant-takeaway`): currency-neutral amounts (`<number> (local currency)` — 14 Margherita, 16 burger, 4 delivery, free over 45) so any country's tenant sets its own symbol; compliance POPIA + regional_privacy; WhatsApp-first channel (plus web / app / SMS) reflected in knowledge, handoff, and mobile-money payment note; languages en, fr, sw; emergency = local emergency services; Nairobi example tenant.
- **Asia** (`asia-restaurant-takeaway`): currency-neutral amounts (same `<number> (local currency)` scheme as Africa); compliance PDPA + regional_privacy (opt-out/access → human handoff); channels web / app / SMS; languages en, zh, hi; emergency = local emergency services; Singapore example tenant with +65 phone norm.

Grounding: each pack's evals are grounded in its own knowledge — EU asserts €-prefixed amounts, Africa/Asia assert the bare number plus `local currency`; hours, delivery fee/radius, and emergency tokens all appear verbatim in that pack's knowledge base.

## Wave 4 live proof
- Target connectors: see `docs/WAVE4_LIVE_CONNECTORS.md`
