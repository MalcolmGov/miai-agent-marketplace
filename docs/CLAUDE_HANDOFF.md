# Claude handoff — active task

## Active: verify flagship Phase 3 scoreboard (Cursor landed)

**Brief:** [`docs/CURSOR_FLAGSHIP_DEPTH.md`](CURSOR_FLAGSHIP_DEPTH.md) (Phase 3)  
**Close note:** [`docs/reports/flagship-depth-phase3-close-2026-08-03.md`](reports/flagship-depth-phase3-close-2026-08-03.md)

**Cursor shipped:**
- `/quality` page — live-LLM hero/flagship rates + Wave 4 connector proofs
- `pnpm scoreboard:live` → `data/reports/eval-live-scoreboard.json` (+ dated MD)
- `eval:live` auto-rebuilds the scoreboard
- WAVE4_EXPAND + flagship agents (`us-events-venue`, gym, pharmacy, accounting-practice)
- Honest labeling: not MockModel; not full catalogue; Depth: live still needs OAuth reconnect

**Claude verify:**
1. `/quality` renders go-live-18 **17/18** and flagship-2 **4/4** with disclaimer
2. No false `Depth: live` flips in this PR
3. `pnpm scoreboard:live` regenerates cleanly
4. Staging OAuth reconnect is **ops**, not claimed done in-repo

**Ops next (Malcolm):** Actions → Connect Calendar/Slack on Railway →  
`DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:live --chat --expand --auto-record`  
→ promote `us-events-venue` Evidence / `Depth: live` only with new corr ids.

---

## Closed: flagship depth Phases 1a / 1b / 2

Runtime workflows + pilots at **`Depth: strong`**. See prior close/verify notes under `docs/reports/flagship-depth-*`.

---

## Nearly done: B+ pilot bar (target 78–80)

**Diligence update:** [`docs/reports/technical-audit-update-2026-08-02.md`](reports/technical-audit-update-2026-08-02.md) — **B+ · 78**.  
**B+ track:** [`docs/CURSOR_BPLUS_PILOT_BAR.md`](CURSOR_BPLUS_PILOT_BAR.md) — Redis + HMAC-only live; PG dual-ACK intentional. MIAI OIDC/wallet external.

---

## ⚠️ NEVER delete unprefixed `data/catalog/*.agent.json`

Those **51 files are ZA (South Africa) market packs**, not orphans.

- Indexed catalogue = **100 × 5 = 500** (`africa-*` is the Africa/ZA sellable SKU)
- On disk = **500 + 51 ZA aliases = 551** (intentional)
- `families.json` maps `markets.za` → same id as `markets.africa`
- Only delete Finder junk: `* 2.json` / `*agent 2.json`

---

## Prior context (do not undo)

| Slice | Owner | Status |
|---|---|---|
| Flagship Phase 1a / 2 / 1b | Cursor | Closed + verified |
| Flagship Phase 3 scoreboard | Cursor | Landed — Claude verify |
| Wave 4 first-slice proofs | Ops | Recorded; staging reconnect needed for expand |
| Partner OIDC + wallet | MIAI | Deferred external wire-up |
