# Claude task — final remediation verification (Phases 0–5 + punch-list)

**Owner:** Claude (independent of Cursor)  
**Repo:** `miai-agent-marketplace` (`main`)  
**Pin commit:** `ed22434` — *Close verifier punch-list residuals: TLS, SSRF, durability, CI.*  
  (If `main` has moved, verify at **latest `origin/main`** and record the SHA.)  
**Prior pin (stale):** `2a40d34` — Phase 2 only; do **not** reuse those PARTIAL verdicts without re-checking.  
**Staging:** `https://miaiweb-production.up.railway.app`  
**Goal:** Re-run the same **9-risk verification** plus a **phase roll-up**, and write a clean sign-off report.

Do **not** delete unprefixed ZA packs. Do **not** re-deepen Go-live Cluster B. Prefer evidence + verdict over drive-by refactors. Surgical fixes only if you find a clear regression introduced by remediation.

---

## Commit range to treat as “remediation”

| Phase | Commits (approx.) | Theme |
|------:|---|---|
| 0 | `4f2cce6`, `6b5f2f0` | Dual-flag mock, SSRF/HMAC, CSP start, secrets |
| 1 | `30e0ed0` | CI + unit tests + static evals |
| 2 | `f0fb3a3`, `2a40d34` | Postgres pool/upserts, Redis path, catalogue memo |
| 3 | `32fb0ce` | Live LLM guardrails, retrieval, zod `/api/v1`, live matrix |
| 4 | `67b75a7` | Privacy/consent/DSAR, AI Act disclosure, compliance drafts |
| 5 | `6e0716b`, `88e1d27` | SSR/SEO, SRI (client-safe split), ZA integrity, ADRs/OSS |
| Punch-list | `ed22434` | TLS default-verify, Shopify/Zendesk safeFetch, body caps, CI tighten |

Also read: `docs/reports/verifier-punchlist-2026-08-02.md`, `docs/adr/*`, `docs/RAILWAY_DEPLOY.md`.

---

## The 9 verifiers (must re-score)

For each risk, return **FIXED / PARTIAL / OPEN / REGRESSED** with:

1. One-line verdict + confidence %  
2. Exact file:line evidence at the pin SHA  
3. What remains (if PARTIAL/OPEN) — bounded residual vs hollow claim  
4. Whether residual is **in-repo** or **blocked** (partner OIDC / Azure / legal / Redis ops)

| # | Risk | What “FIXED” means now |
|---|---|---|
| 1 | Mock-default auth | Elevated roles need dual prod flags; boot fail-closed; incomplete hatch fails |
| 2 | Webhook signing | HMAC-SHA256 over `timestamp.body`; constant-time verify send+receive |
| 3 | Durable persistence | Row upserts + pool + migrations; **prod requires `DATABASE_URL`** (dual file-fallback ACK only) |
| 4 | SSRF gaps | MCP/Woo **and** Shopify/Zendesk via `safeFetch`; undici pin **fail-closed** (no bare-fetch fallback) |
| 5 | Secrets + pg TLS | Weak secrets blocked; **TLS verify default on**; insecure SSL needs dual ACK |
| 6 | CSP | `unsafe-eval` gone; score honestly if `unsafe-inline` remains |
| 7 | CI/CD | Push/PR gate: typecheck/lint/test/catalog integrity/static-eval; **staticHigh>0 fails**; critical audit blocking; gitleaks |
| 8 | Validation + rate-limit | zod on chat/rent (+ max lengths); body `Content-Length` cap; Redis errors fail closed when configured |
| 9 | AI depth + model config | `model.fallback`/temp/max wired; shared live guardrails; note MockModel vs live-LLM honestly |

### Extra checks (not in original 9, but required for this pass)

| Check | Expect |
|---|---|
| Phase 3 live guardrails | Shared layer runs for live models (not Mock-only) |
| Phase 4 DSAR erase + AI disclosure | Routes/pages exist; drafts labeled draft |
| Phase 5 SRI | `agent.js` integrity; client must **not** import `node:crypto` |
| Phase 5 catalogue | `pnpm catalog:integrity` → 500 indexed, 51 ZA aliases kept |
| building-management grounding | Eval grounding matches KB (1-bed R1,450 / 2-bed R1,980) |
| Staging health | `/api/health` → `status:ok`, `storeBackend:postgres` (ops may have `PG_SSL_REJECT_UNAUTHORIZED=0` + ACK) |

---

## Commands (run in order)

```bash
cd /path/to/miai-agent-marketplace
git fetch origin && git checkout main && git pull
git rev-parse HEAD   # record SHA in the report

pnpm install --frozen-lockfile
pnpm build:packages
pnpm typecheck
pnpm test
pnpm catalog:integrity
pnpm eval:suite:static
pnpm run ci          # full local gate if time allows

# Spot evidence (examples — expand as needed)
rg -n "rejectUnauthorized|PG_SSL|checkProductionPersistence" apps/web/src/lib packages/connectors/src
rg -n "safeFetch|normalizeShop|normalizeZendesk" packages/connectors/src
rg -n "unsafe-eval|unsafe-inline" apps/web/next.config.ts
rg -n "signWebhook|timingSafeEqual|x-miai-signature" packages/connectors apps/web
rg -n "scriptIntegrity|agent-js-script|createHash" apps/web/src
rg -n "Eval grounding|R1,450|R1,980" data/catalog/building-management.agent.json

curl -sS https://miaiweb-production.up.railway.app/api/health | jq .
```

Do **not** treat MockModel pass rate as live-LLM quality.

---

## Deliverable

Write **`docs/reports/remediation-verify-YYYY-MM-DD.md`** with:

1. **Verdict** — `N FIXED · M PARTIAL · K OPEN · R REGRESSED` (must sum to 9 for the core table)  
2. **Pin SHA** + whether staging health was green  
3. **Per-risk table** (the 9) with evidence  
4. **Phase roll-up** — one line each for Phases 0–5 + punch-list: held / regressed / residual  
5. **Residual punch-list** — only items still PARTIAL/OPEN, with owner (in-repo vs blocked)  
6. **Regressions** — empty if none; otherwise exact repro  

Optional: update `docs/CLAUDE_HANDOFF.md` Active section to point at the new report.

---

## Non-goals

- Partner OIDC / wallet cutover  
- Azure Private Link / Key Vault / residency claims  
- SOC2/HIPAA certification language  
- Deleting ZA unprefixed packs  
- Full CSP nonce migration unless already trivially landable without breaking App Router
