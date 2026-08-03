# Claude handoff — active task

## Active: verify flagship depth Phase 1a (Cursor landed)

**Brief:** [`docs/CURSOR_FLAGSHIP_DEPTH.md`](CURSOR_FLAGSHIP_DEPTH.md)  
**Close note:** [`docs/reports/flagship-depth-close-2026-08-03.md`](reports/flagship-depth-close-2026-08-03.md)

**Cursor shipped Phase 1a** — five workflow modules + dispatch + unit tests + pilot `Depth: live` updates + `eval:live --set=flagship-1a` / `--families=`. **Phase 1b skipped** (Cluster B boundary honored — no `.agent.json` edits). Phase 2 still needs Malcolm’s industry pick. Phase 3 scoreboard page deferred; CLI targeting landed.

**Claude verify:** same acceptance-bar checklist in the brief — file:line for each workflow + `index.ts` dispatch; spot-check pilots’ `Depth: live` + Evidence; confirm Cluster B packs untouched; if API keys available, run `pnpm eval:live --set=flagship-1a` and attach the report (do not treat MockModel % as live quality).

---

## Nearly done: B+ pilot bar (target 78–80)

**Diligence update:** [`docs/reports/technical-audit-update-2026-08-02.md`](reports/technical-audit-update-2026-08-02.md) — **B · 72**.  
**B+ track:** [`docs/CURSOR_BPLUS_PILOT_BAR.md`](CURSOR_BPLUS_PILOT_BAR.md) — Redis + PG TLS ops, nightly `eval:live` (non-blocking). **SOC 2 / counsel are not mandatory for early pilots.** Per its own "Done when" checklist: ops bar essentially closed; only remaining item is an audit-narrative score refresh.

**Optional:** re-run [`docs/CLAUDE_VERIFY_REMEDIATION.md`](CLAUDE_VERIFY_REMEDIATION.md) at latest `main` for a fresh 9-risk sign-off.

---

### ✅ Done — remediation verification (Phases 0–5 + punch-list)

Verified at pin `63f3718`: **5 FIXED · 4 PARTIAL · 0 OPEN · 0 REGRESSED** → `docs/reports/remediation-verify-2026-08-02.md` (PR #3). Original verify brief:

**Brief:** [`docs/CLAUDE_VERIFY_REMEDIATION.md`](CLAUDE_VERIFY_REMEDIATION.md)  
**Pin:** `ed22434` on `main` (or latest `origin/main` if moved — record SHA).  
**Prior verifier pin `2a40d34` is stale** — re-score all 9 risks from source.

**Deliverable:** `docs/reports/remediation-verify-YYYY-MM-DD.md`  
Verdict format: `N FIXED · M PARTIAL · K OPEN · R REGRESSED` for the 9 risks, plus phase roll-up.

**Do not:** delete ZA unprefixed packs; re-deepen Cluster B; claim MockModel % as live-LLM quality.

**Cursor already closed punch-list residuals in `ed22434`** (TLS default-verify, Shopify/Zendesk safeFetch, body caps, CI tighten, building-management grounding). Staging may run with `PG_SSL_REJECT_UNAUTHORIZED=0` + `I_UNDERSTAND_PG_SSL_INSECURE=1` until a verifiable CA is mounted — score that as intentional dual-ACK residual, not silent fail-open.

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
| Technical audit + remediation Phases 0–5 | Cursor | Done through `ed22434` |
| Punch-list follow-up | Cursor | Done — see `docs/reports/verifier-punchlist-2026-08-02.md` |
| Wave 3 market localization | Cursor + Claude | Done |
| Go-live Cluster B deepen | Claude | Done — **protected from overwrite** |
| Go-live 100 stand-behind | Cursor | Done — filter `/?pilot=1` |
| Depth strong 100/100 | Cursor | Done |

**Do not re-deepen Cluster B** (`restaurant-takeaway` · `salon-booking` · `clinic-front-desk` · `customer-support` · `delivery-tracking` · `trades-receptionist`).

## Optional after verify sign-off

- Partner OIDC / wallet cutover (blocked externally)
- CSP nonce / `strict-dynamic` (still open residual)
- Wave 4 live connector proofs — `pnpm proof:live` · `docs/WAVE4_LIVE_CONNECTORS.md`
