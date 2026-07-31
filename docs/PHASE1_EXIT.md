# Phase 1 exit criteria

Business can complete this loop:

1. Browse marketplace → open **US Customer Support**
2. Rent (Standard / Pro / Enterprise)
3. Pick **Sonnet**, paste knowledge
4. Connect **Shopify + Calendar + Slack** in Actions
5. Copy `agent.js` snippet (Install)
6. Sandbox chat (order lookup / booking / handoff)
7. Top up tokens; empty balance pauses replies
8. Live embed message burns tokens

## Automated check

```bash
pnpm --filter @miai/web build
cd apps/web && PORT=3000 pnpm exec next start
# other terminal:
pnpm demo:phase1
pnpm eval:smoke
```

## Pilots with connector presets

- `us-customer-support`
- `us-dental-front-desk`
- `us-home-services`
- `eu-trades-receptionist`
- `eu-hotel-guest`
