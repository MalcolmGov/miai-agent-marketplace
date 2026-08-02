# Production scale: 18 → 220

**Goal:** Customer-facing production comfort across the **full licensed catalogue** — 55 families × 4 market packs = **220 agents**.

Partner demo is done. This is the industrial path to stand behind every SKU.

## Math

| Layer | Count | Status (start of scale) |
|---|---:|---|
| Families | 55 | — |
| US heroes at Depth strong + pilot doc | 18 | Wave 1 done |
| US heroes remaining | 37 | Wave 2 (in progress) |
| Market packs per family | eu · africa · asia | Wave 3 after US hero is strong |
| Total agents | 220 | Wave 2+3 |

## Definition of done (same bar, every agent)

From `PILOT_PRODUCTION_BAR.md`:

1. Job story + golden path in `docs/pilots/{family}.md`
2. Confirm-before-write on every side-effect tool
3. Realistic tenant knowledge (replaceable per customer)
4. Clear human handoff
5. Evals grounded in knowledge (no drift)
6. Install path (Rent → website/App)
7. History / Insights correlation

`depth: live` still requires real connector proof — track separately per connector, not as a blocker for catalogue production depth.

## Waves

### Wave 1 — Go-live 18 (done)
Certified first wave (US heroes + pilot docs). Catalogue filter **Go-live 18**.

### Wave 2 — Remaining 37 US heroes
Parallel clusters D / E / F deepen `data/catalog/us-{family}.agent.json` + `docs/pilots/{family}.md`.

### Wave 3 — Market packs (×3)
For each family with a strong US hero, deepen `eu-` / `africa-` / `asia-` variants (currency, compliance, locale, grounded evals).

**Claude ownership (preferred):** Wave 3 for families already strong on US — see `CLAUDE_HANDOFF.md`.

### Wave 4 — Live connector proof
Priority connectors (Calendar, Slack, HubSpot, ticket) on a subset of Wave 1, then expand.

## Status command

```bash
node scripts/production-wave-status.mjs
```

## Parallel rules

See `PARALLEL_WORKSTREAMS.md`. One family owner at a time; no shared UI edits from deepeners.
