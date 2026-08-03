# Flagship depth Phase 3 close — 2026-08-03

**Brief:** `docs/CURSOR_FLAGSHIP_DEPTH.md` (Phase 3 — publish eval:live scoreboard)  
**Owner:** Cursor  
**Branch:** `cursor/quality-scoreboard-phase3`

## Why this move

Flagship depth Phases 1a / 1b / 2 closed orchestration at **`Depth: strong`**. Live-LLM samples already existed as markdown reports, but diligence still had no single public surface that:

1. Separates **live-model** pass rates from MockModel catalogue gates  
2. States **hero/flagship coverage only** (not 551 agents)  
3. Surfaces Wave 4 connector proof status next to those rates  
4. Makes the next **Depth: live** promotion path operational (OAuth reconnect → `proof:live --expand`)

MyInstantAI OIDC / wallet / gateway remain external and are intentionally not blocked on.

## Shipped

| Item | Path / command |
|---|---|
| Scoreboard builder | `pnpm scoreboard:live` → `scripts/build-eval-live-scoreboard.mjs` |
| Machine-readable board | `data/reports/eval-live-scoreboard.json` |
| Dated MD board | `docs/reports/eval-live-scoreboard-2026-08-03.md` |
| Public page | `/quality` (`apps/web/src/app/quality/page.tsx`) |
| Nav | Sidebar + footer → Live quality |
| Auto-refresh | `eval:live` rebuilds scoreboard after each run |
| Wave 4 expand | `us-events-venue`, `us-gym-membership`, `us-pharmacy`, `us-accounting-practice` added to `WAVE4_EXPAND` |

## Evidence published (not re-run in this PR)

| Set | Live pass | Source |
|---|---|---|
| Go-live 18 | **17/18 (94.4%)** | `docs/reports/eval-live-2026-08-03-go-live-18.md` |
| Flagship 2 | **4/4 (100%)** | `docs/reports/eval-live-2026-08-03-flagship-2.md` |

Known residual in go-live-18: `us-hotel-guest` breakfast prompt failed (truncated/wrong section). Fix + re-sample is a follow-up, not a Phase 3 blocker.

## Staging reality check (2026-08-03)

`/api/health`: Postgres + Redis ok; `modelMode: anthropic`; `authMode`/`walletMode: mock` (MIAI wire-up deferred).

`pnpm proof:live --chat` against Railway: OAuth **configured=true**, **connected=false** for Slack / Google Calendar / HubSpot → proofs skipped until Actions → Connect.

**Do not** flip more pilots to `Depth: live` until new correlation ids are recorded via:

```bash
DEMO_BASE=https://miaiweb-production.up.railway.app \
  pnpm proof:live --chat --expand --auto-record
```

Prefer **`us-events-venue`** as the flagship buyable demo once Calendar+Slack are reconnected.

## Guardrails kept

- No new catalogue families  
- No Cluster B `.agent.json` edits  
- No false `Depth: live` promotions  
- No claim that scoreboard = full-catalogue live quality  

## Claude verification ask

1. `/quality` loads and shows go-live-18 + flagship-2 rates with disclaimer  
2. `pnpm scoreboard:live` regenerates JSON/MD  
3. WAVE4_EXPAND includes `us-events-venue`  
4. Pilots for flagship families still say `Depth: strong` unless Wave 4 evidence already existed  
