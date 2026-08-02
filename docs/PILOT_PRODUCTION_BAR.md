# Production go-live bar

**North star:** production comfort on **all 500** agents — see `PRODUCTION_SCALE_500.md`.

Catalogue size (500) is the **license entitlement**. Depth is earned family-by-family, then pack-by-pack. Roadmap: `FAMILIES_100.md`.

## Definition of done (hero US agent, then market packs)

A family is production-ready (`depth: strong`) when:

1. **Job story** — who / channel / outcome in `docs/pilots/{family}.md`
2. **Golden path** — 5–8 turns works in Studio; confirm-before-write for every side-effect tool
3. **Realistic knowledge** — real business facts; customer can replace with theirs
4. **Handoff** — human path when stuck / clinical / out of scope
5. **Guardrails** — refuse unsafe / cross-tenant; evals grounded in knowledge
6. **Install** — embed or App path documented and gated on rent/live
7. **Observability** — turns appear in History with correlation id; tokens visible in Insights

`depth: live` additionally requires **proven live connector** calls (Calendar / Slack / CRM / ticket) with a History correlation id on staging or production.

## Certification waves

| Wave | Count | Role |
|------|------:|------|
| **Go-live 18** | 18 | Featured demos (Clusters A–C) |
| **Go-live 55** | 55 | Prior stand-behind wave |
| **Go-live 100** | 100 | **Current stand-behind** — catalogue filter `/?pilot=1` |

Run:

```bash
pnpm certify:golive              # Go-live 100 checklist
pnpm certify:golive -- --wave55  # prior 55 wave
pnpm certify:golive -- --next37  # the +37 beyond featured 18
pnpm certify:golive -- --beyond55 # the +45 beyond 55
```

### Go-live 18 (featured)

#### Cluster A
executive-assistant · it-helpdesk · dental-front-desk · hotel-guest · sales-qualifier · home-services

#### Cluster B
restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist

#### Cluster C
events-venue · onboarding-buddy · accounting-practice · building-management · gym-membership · pharmacy

### Go-live 55

All IDs in `GO_LIVE_55_FAMILY_IDS` (`apps/web/src/lib/monday-pilot.ts`) — includes Go-live 18 plus 37 more verticals (HR, banking, insurance, travel, etc.).

### Go-live 100

All IDs in `MONDAY_PILOT_FAMILY_IDS` / `GO_LIVE_100_FAMILY_IDS` — every Depth-strong family (Go-live 55 plus 45 more).

## Parallel work

See `PARALLEL_WORKSTREAMS.md` and `WAVE4_LIVE_CONNECTORS.md` for live proofs.
