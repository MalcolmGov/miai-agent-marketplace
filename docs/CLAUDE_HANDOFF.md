# Claude handoff — active task

## Active: Cursor — close in-repo residual punch-list

**Brief:** [`docs/CURSOR_RESIDUAL_PUNCHLIST.md`](CURSOR_RESIDUAL_PUNCHLIST.md)
Convert the 4 remaining PARTIAL verdicts to FIXED. **P1 (security):** SSRF crawl DNS-pin · webhook HMAC-only flag · CSP nonce. **P2:** persistence multi-replica reads · validation coverage. **P3:** live-LLM eval harness. Blocked (not Cursor): compliance legal copy. When P1+P2 land, ping Claude to re-run `docs/CLAUDE_VERIFY_REMEDIATION.md` for a fresh sign-off.

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
