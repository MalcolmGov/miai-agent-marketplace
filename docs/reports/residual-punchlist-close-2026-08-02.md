# Residual punch-list close — 2026-08-02

**Brief:** `docs/CURSOR_RESIDUAL_PUNCHLIST.md`  
**Owner:** Cursor  
**Tests:** `apps/web/test/residual-punchlist.test.mjs` + expanded `api-contract.test.mjs`

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | SSRF crawl DNS-pin | **CLOSED** | `fetchWithSsrfGuard` → `safeFetch` (undici pin, fail-closed) |
| 2 | Webhook HMAC-only flag | **CLOSED** | `WEBHOOK_SINK_HMAC_ONLY=1` → `allowLegacyRawSecret: false`; documented in `.env.example` + `RAILWAY_DEPLOY.md` |
| 3 | CSP `unsafe-inline` → nonce | **CLOSED** (script-src) | Per-request nonce in `middleware.ts` + boot scripts; static CSP removed from `next.config.ts`. `style-src` still allows `unsafe-inline` for next/font + Tailwind |
| 4 | Store multi-replica reads | **CLOSED** | Postgres path read-through for `getWorkspaceAgent` / `listWorkspaceAgents` / `listAudit` |
| 5 | Zod on remaining POSTs | **CLOSED** | Schemas in `api-schemas.ts` wired into listed handlers |
| 6 | Live-LLM eval harness | **LANDED (opt-in)** | `pnpm eval:live` → `docs/reports/eval-live-*.md` (not a CI gate). Semantic retrieval still optional / future |
| — | Compliance legal copy | **BLOCKED** | Counsel — leave DRAFT labels |

**Claude:** re-run `docs/CLAUDE_VERIFY_REMEDIATION.md` for a fresh 9-risk sign-off on P1+P2.
