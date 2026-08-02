# Production scale: 18 → 410

**Goal:** Customer-facing production comfort across the **full licensed catalogue** — 82 families × 5 market packs = **410 agents** (roadmap: ~100 × 5 ≈ 500 — see `FAMILIES_100.md`).

Partner demo is done. This is the industrial path to stand behind every SKU.

## Current state

| Layer | Status |
|---|---|
| US heroes | **82 / 82** (Waves 1–2 family expansion live) |
| Prefixed packs on disk | **410 / 410** |
| Wave 3 market packs | **Done** |
| Wave 4 live connectors | **Harness ready** — first slice 0/4 proofs (needs OAuth env on staging) |
| Target | **410** rentable; `depth: live` tracked separately |

Run `pnpm production:status`.

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
For each family with a strong US hero, deepen `eu-` / `africa-` / `asia-` / `oceania-` variants (currency, compliance, locale, grounded evals).

**Claude ownership (preferred):** Wave 3 for families already strong on US — see `CLAUDE_HANDOFF.md`.

### Wave 4 — Live connector proof
Priority connectors (Calendar, Slack, HubSpot, ticket) on first-slice Cluster A agents.

See `docs/WAVE4_LIVE_CONNECTORS.md` and `pnpm proof:live`.
True live calls need Railway OAuth env; product code + harness are in place.

## Status command

```bash
node scripts/production-wave-status.mjs
```

## Parallel rules

See `PARALLEL_WORKSTREAMS.md`. One family owner at a time; no shared UI edits from deepeners.
