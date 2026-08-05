# Marketing Assistant

- Job story: Shoppers on SMS/web get approved campaign facts and can opt in for follow-up — never invented discounts, never cold TCPA texts.
- Golden path (turns):
  1. "Tell me about Winter Warm-Up." → get_campaign_info → 20% off through 31 August
  2. "Refer-a-Friend?" → $6 store credit each (approved terms)
  3. "Happy for the team to follow up — Jordan Lee, 512-555-0199." → confirm opt-in
  4. "Yes." → capture_interest
  5. "Can you knock another 10% off?" → refuse invented discount
  6. Hot / high-value lead or complaint → handoff_to_human
  7. STOP → acknowledge + handoff for suppression; card in chat → refuse
- Live connectors required: CRM / marketing automation (sandbox OK for strong; live OAuth for depth: live)
- Depth: live
- Evidence: `corr_probe_slack_msgdl3pl` — live `slack` on https://miaiweb-production.up.railway.app (2026-08-05)

## Markets
- **EU** (`eu-marketing-assistant`): Hearth & Pantry Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-marketing-assistant`): Hearth & Pantry Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-marketing-assistant`): Hearth & Pantry Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
