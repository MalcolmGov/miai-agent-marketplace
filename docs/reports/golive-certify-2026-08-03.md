# Go-live certification — 2026-08-03

Scope: **Go-live 100 stand-behind — 100**

| Metric | Value |
|--------|------:|
| Checked | 100 |
| Cert-ready (strong+pilot+5 packs) | 100 |
| Blocked | 0 |
| Depth live (stretch) | 13 |

## Definition

Cert-ready = Depth strong|live + pilot doc + all 5 market packs.
Depth live (connector proof) is tracked separately — not required to join Go-live 100.

## Ready

| Family | Depth | Packs |
|--------|-------|------:|
| accounting-practice | strong | 5/5 |
| admissions | strong | 5/5 |
| agency-studio | strong | 5/5 |
| bank-branch | strong | 5/5 |
| bookkeeping | strong | 5/5 |
| building-management | live | 5/5 |
| clinic-front-desk | live | 5/5 |
| course-advisor | strong | 5/5 |
| customer-support | strong | 5/5 |
| delivery-tracking | live | 5/5 |
| dental-front-desk | live | 5/5 |
| dental-practice | strong | 5/5 |
| events-venue | strong | 5/5 |
| executive-assistant | live | 5/5 |
| field-service | strong | 5/5 |
| fleet-driver | strong | 5/5 |
| front-desk | strong | 5/5 |
| grant-stock-planner | strong | 5/5 |
| gym-membership | strong | 5/5 |
| home-services | live | 5/5 |
| hotel-concierge | strong | 5/5 |
| hotel-guest | live | 5/5 |
| hr-helpdesk | strong | 5/5 |
| insurance-broker | strong | 5/5 |
| insurance-claims | strong | 5/5 |
| it-helpdesk | live | 5/5 |
| law-firm-intake | strong | 5/5 |
| loan-prequalifier | strong | 5/5 |
| loyalty-rewards | strong | 5/5 |
| marketing-assistant | strong | 5/5 |
| mobile-money | strong | 5/5 |
| onboarding-buddy | strong | 5/5 |
| order-tracking | strong | 5/5 |
| payment-disputes | strong | 5/5 |
| payroll-queries | strong | 5/5 |
| pharmacy | strong | 5/5 |
| policy-compliance | strong | 5/5 |
| procurement | strong | 5/5 |
| product-finder | strong | 5/5 |
| property-enquiries | strong | 5/5 |
| remittance | strong | 5/5 |
| rental-enquiries | strong | 5/5 |
| restaurant-takeaway | strong | 5/5 |
| returns-exchanges | strong | 5/5 |
| sales-qualifier | live | 5/5 |
| salon-booking | live | 5/5 |
| spaza-merchant | strong | 5/5 |
| stock-availability | strong | 5/5 |
| student-helpdesk | strong | 5/5 |
| tour-activity | strong | 5/5 |
| trades-receptionist | live | 5/5 |
| travel-desk | strong | 5/5 |
| utility-billing | strong | 5/5 |
| vas-concierge | strong | 5/5 |
| veterinary | strong | 5/5 |
| agri-advisory | strong | 5/5 |
| ai-coding-assistant | strong | 5/5 |
| airtime-bundles | strong | 5/5 |
| bi-analyst | strong | 5/5 |
| case-management | strong | 5/5 |
| citizen-services | strong | 5/5 |
| contract-review | strong | 5/5 |
| credit-cards | strong | 5/5 |
| cybersecurity-desk | strong | 5/5 |
| data-quality | strong | 5/5 |
| device-upgrades | strong | 5/5 |
| devops-assistant | strong | 5/5 |
| documentation-assistant | strong | 5/5 |
| energy-operations | strong | 5/5 |
| enterprise-connectivity | strong | 5/5 |
| executive-dashboards | strong | 5/5 |
| factory-operations | strong | 5/5 |
| farm-operations | strong | 5/5 |
| fibre-support | strong | 5/5 |
| financial-reporting | strong | 5/5 |
| fraud-investigations | strong | 5/5 |
| interview-scheduling | strong | 5/5 |
| investment-advisor | strong | 5/5 |
| learning-development | strong | 5/5 |
| legal-research | strong | 5/5 |
| licensing | strong | 5/5 |
| maintenance-desk | strong | 5/5 |
| media-content-desk | strong | 5/5 |
| mortgage-advisor | strong | 5/5 |
| municipality-desk | strong | 5/5 |
| network-faults | strong | 5/5 |
| passport-visa | strong | 5/5 |
| performance-reviews | strong | 5/5 |
| production-planning | strong | 5/5 |
| prompt-engineering | strong | 5/5 |
| qa-testing | strong | 5/5 |
| quality-assurance | strong | 5/5 |
| recruitment | strong | 5/5 |
| sales-forecasting | strong | 5/5 |
| security-incident | strong | 5/5 |
| sim-registration | strong | 5/5 |
| social-services | strong | 5/5 |
| tax-office | live | 5/5 |
| warehouse-operations | strong | 5/5 |
| wealth-management | live | 5/5 |

## Blocked / gaps

(none)

## Manual checklist (per family)

From `docs/PILOT_PRODUCTION_BAR.md`:

1. [ ] Golden path 5–8 turns in Studio (confirm-before-write)
2. [ ] Handoff works when stuck / out of scope
3. [ ] `pnpm eval:suite -- --agents us-{family}` green
4. [ ] Install path (Rent → embed/App) gated correctly
5. [ ] History correlation id visible after a turn
6. [ ] (Stretch) Live connector proof → Depth live

## Next steps

- Featured demos: Go-live **18** (Cluster A–C)
- Stand-behind catalogue filter: Go-live **100** (`/?pilot=1`)
- Wave subsets: `pnpm certify:golive -- --wave55` · `--next37` · `--beyond55`
- Live proofs: `pnpm proof:live` · `docs/WAVE4_LIVE_CONNECTORS.md`
