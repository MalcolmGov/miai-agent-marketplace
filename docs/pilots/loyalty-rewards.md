# Loyalty Rewards

- Job story: Members on SMS/web check points and tiers, redeem rewards after confirm-before-write, and escalate account disputes.
- Golden path (turns):
  1. "What's my balance? Member M-4471." → get_points_balance
  2. "What do Gold members get?" → get_tier_benefits
  3. "Redeem $10 voucher (100 points)." → confirm cost + resulting balance
  4. "Yes, go ahead." → redeem_reward
  5. Earn rate: 1 pt / $10 · 100 pts = $10 · expiry 24 months
  6. Missing points / wrong tier → handoff_to_human
  7. Another member's balance / card in chat → refuse
- Live connectors required: Loyalty platform (sandbox OK for strong; live OAuth for depth: live)
- Depth: strong
- Evidence: (none yet — add History correlation id / Loom when live)

## Markets
- **EU** (`eu-loyalty-rewards`): Oak & Ember Rewards Berlin (Berlin); currency EUR; compliance GDPR; emergency 112.
- **Africa** (`africa-loyalty-rewards`): Oak & Ember Rewards Johannesburg (Johannesburg); WhatsApp-first; POPIA / regional privacy; local currency; local emergency services.
- **Asia** (`asia-loyalty-rewards`): Oak & Ember Rewards Singapore (Singapore); PDPA / regional privacy; local currency; local emergency services.
