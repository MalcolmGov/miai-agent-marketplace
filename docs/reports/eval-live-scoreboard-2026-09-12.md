# Live-LLM quality scoreboard — 2026-09-12

**Live-LLM samples only (real model adapter). MockModel catalogue eval pass-rates are a different metric and must not be sold as live quality. Coverage is the hero / flagship sets named below — not the full 551-agent catalogue.**

## Summary

| Set | Date | Model | Live pass |
|---|---|---|---|
| Go-live 18 heroes (`go-live-18`) | 2026-09-12 | `anthropic` | **17/18** (94.4%) |
| Flagship depth Phase 1a (`flagship-1a`) | 2026-09-12 | `anthropic` | **4/5** (80%) |
| Flagship depth Phase 2 (financial + vet) (`flagship-2`) | 2026-09-12 | `anthropic` | **4/4** (100%) |
| families-5 (`families-5`) | 2026-09-12 | `anthropic` | **5/5** (100%) |

## Wave 4 connector proofs (first slice)

- Agents with recorded proof: **4 / 4**
- Connectors proven: google_calendar, hubspot, mcp, slack, webhook
- Staging OAuth may show `configured=true` but `connected=false` until Actions → Connect is re-run.

## Per-set detail

### Go-live 18 heroes

Source: `docs/reports/eval-live-2026-09-12-go-live-18.md`

| | Agent | Prompt |
|---|---|---|
| ✅ | `us-accounting-practice` | When is monthly payroll tax due? |
| ✅ | `us-events-venue` | What wedding packages do you offer? |
| ✅ | `us-building-management` | How much is the monthly levy for a 2-bedroom? |
| ❌ | `us-pharmacy` | Do you have Panado 500mg in stock? |
| ✅ | `us-gym-membership` | What memberships do you offer? |
| ✅ | `us-dental-front-desk` | What treatments do you offer? |
| ✅ | `us-hotel-guest` | What time is breakfast? |
| ✅ | `us-executive-assistant` | What's on my calendar tomorrow? |
| ✅ | `us-it-helpdesk` | My laptop won't connect to VPN. |
| ✅ | `us-sales-qualifier` | Tell me about the Growth plan. |
| ✅ | `us-salon-booking` | Can I book a haircut Saturday morning? |
| ✅ | `us-home-services` | I need a plumber this week. |
| ✅ | `us-clinic-front-desk` | What should I bring to my first visit? |
| ✅ | `us-restaurant-takeaway` | Do you offer gluten-free options? |
| ✅ | `us-customer-support` | How do I reset my password? |
| ✅ | `us-delivery-tracking` | Where is my package? |
| ✅ | `us-trades-receptionist` | Emergency plumbing — can someone come out? |
| ✅ | `us-onboarding-buddy` | What do I do on my first day? |

### Flagship depth Phase 1a

Source: `docs/reports/eval-live-2026-09-12-flagship-1a.md`

| | Agent | Prompt |
|---|---|---|
| ✅ | `us-accounting-practice` | When is monthly payroll tax due? |
| ✅ | `us-events-venue` | What wedding packages do you offer? |
| ✅ | `us-building-management` | How much is the monthly levy for a 2-bedroom? |
| ❌ | `us-pharmacy` | Do you have Panado 500mg in stock? |
| ✅ | `us-gym-membership` | What memberships do you offer? |

### Flagship depth Phase 2 (financial + vet)

Source: `docs/reports/eval-live-2026-09-12-flagship-2.md`

| | Agent | Prompt |
|---|---|---|
| ✅ | `us-mobile-money` | What's my float? |
| ✅ | `us-wealth-management` | What are the key facts about your wealth desk? |
| ✅ | `us-tax-office` | When is the individual filing deadline? |
| ✅ | `us-veterinary` | What do you charge for a wellness consult? |

### families-5

Source: `docs/reports/eval-live-2026-09-12-families-5.md`

| | Agent | Prompt |
|---|---|---|
| ✅ | `us-mobile-money` | What's my float? |
| ✅ | `us-tax-office` | When is the individual filing deadline? |
| ✅ | `us-dental-front-desk` | What treatments do you offer? |
| ✅ | `us-hotel-guest` | What time is breakfast? |
| ✅ | `us-sales-qualifier` | Tell me about the Growth plan. |


## Honest labeling

- This page/report is **not** a CI gate.
- Do **not** equate these rates with `eval:suite:static` MockModel numbers.
- Do **not** claim full-catalogue live quality from hero-set samples.
