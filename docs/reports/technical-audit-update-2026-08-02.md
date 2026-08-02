# MyInstantAI Agent Marketplace — Technical Due-Diligence Audit (Updated)

> **Confidential.** Post-remediation update to the independent static-analysis audit.  
> **Supersedes scoring in** [`technical-audit-2026-08-02.md`](./technical-audit-2026-08-02.md) (baseline pin `d4cfea2`).  
> That baseline document remains the full narrative; **this file is the current verdict**.

| | |
|---|---|
| **Repo** | `miai-agent-marketplace` |
| **Baseline audit** | 2026-08-02 @ `d4cfea2` — **B– · 61 / 100** |
| **Update pin** | `main` @ `6dcb793` (+ Learn-more capabilities on branch tip / next commit) |
| **Update date** | 2026-08-02 |
| **Method** | Evidence from remediation Phases 0–5, verifier punch-list, residual punch-list close, and pack-derived catalogue UX |
| **Staging** | `https://miaiweb-production.up.railway.app` |

---

## Verdict — **B** · Engineering score **72 / 100**

The baseline audit correctly identified a **strong IP / architecture core** wrapped in a **demo-grade operational shell**. Remediation Phases **0–5** plus the residual punch-list closed the highest-severity in-repo gaps: dual-flag mock rails, HMAC webhooks, DNS-pinned SSRF, required Postgres, CI + tests + static-eval gates, zod validation, CSP script nonces, DSAR/consent drafts, and opt-in live-LLM eval.

**What changed the grade:** Testing, DevOps, Security, and Data Architecture moved from “prototype” to “pilot-production capable.” What still caps the score below **A** is enterprise procurement (no SOC 2 / counsel-signed policies), live-LLM quality measurement (mock gate ≠ live quality; semantic retrieval not shipped), and multi-replica ops maturity (Redis/Azure HA still ops/partner work).

**One-line verdict:** investable marketplace IP with a **hardened pilot shell** — suitable for controlled staging / early customers with dual-ACK staging flags understood; **not** yet enterprise-certified production.

---

## Scoreboard — baseline vs updated

| Dimension | Baseline | Updated | Δ | Driver |
|---|---:|---:|---:|---|
| Documentation | 80 | 84 | +4 | ADRs, Railway runbook, compliance drafts, residual close notes |
| Integrations | 76 | 80 | +4 | Shopify/Zendesk/MCP/Woo via `safeFetch`; HMAC webhooks |
| AI complexity | 74 | 76 | +2 | Live guardrails + lexical retrieval + `eval:live` harness |
| Frontend complexity | 72 | 74 | +2 | SSR/SEO, SRI-safe agent.js, richer Learn more |
| Code quality | 71 | 74 | +3 | zod schemas, surgical hardening without god-module rewrite |
| Cloud architecture | 66 | 68 | +2 | Postgres-required prod path; Azure Bicep still unused in prod |
| Backend complexity | 66 | 72 | +6 | Row upserts, read-through, body caps, RBAC + public path cleanup |
| Maintainability | 66 | 70 | +4 | CI gate, catalog integrity, capability extractor tests |
| Infrastructure | 63 | 68 | +5 | Migrations, dual-ACK TLS/file fallbacks |
| Security maturity | 63 | 78 | +15 | Dual-flag mock, SSRF pin, HMAC-only flag, CSP nonce (script-src) |
| DevOps | 52 | 74 | +22 | `.github/workflows/ci.yml` + gitleaks + `staticHigh>0` fail |
| Enterprise readiness | 45 | 58 | +13 | Consent/DSAR/AI Act drafts; certs & counsel still open |
| Data architecture | 45 | 70 | +25 | Prod requires `DATABASE_URL`; Postgres read-through |
| Testing | 40 | 70 | +30 | Wallet/connectors/web unit tests + api-contract + residual suite |
| Scalability | 33 | 55 | +22 | Durable writes; Redis fail-closed when configured; ops still 1-replica default |
| **Overall (weighted)** | **61** | **72** | **+11** | **B– → B** |

**Architecture rating:** 8.0 / 10 · **AI maturity:** 62 · **Production readiness (pilot):** ~68 · **Enterprise procurement:** ~58 · **Overall code quality:** 74.

---

## Original “four findings that matter most” — disposition

| # | Baseline finding | Status | Evidence / residual |
|---|---|---|---|
| 1 | Not horizontally scalable — in-memory + O(N) rewrites | **MOSTLY CLOSED (in-repo)** | Postgres pool + row upserts; prod boot requires `DATABASE_URL`. Reads for rentals/audit are Postgres read-through (multi-replica coherent). **Residual (ops):** Redis must be provisioned for shared rate-limit/sessions; Railway still typically 1 replica. |
| 2 | No CI + ~zero tests | **CLOSED** | `pnpm run ci` / GitHub Actions: typecheck, tests, catalog integrity, `eval:suite:static` with `staticHigh>0` fail; gitleaks job. Web suite includes security-boot, SSRF residual, api-contract, family-capabilities, etc. |
| 3 | Mock-default auth / single-flag fragility | **CLOSED** | Dual flags `ALLOW_MOCK_RAILS` + `I_UNDERSTAND_MOCK_RAILS_IN_PROD`; incomplete hatch fails closed. Same pattern for embed `*` and file-fallback. |
| 4 | AI depth shallow; live safety = prompt only | **PARTIAL** | Shared live guardrails + lexical retrieval shipped; `pnpm eval:live` opt-in (not CI). Semantic/embeddings retrieval **not** shipped. MockModel % must not be sold as live quality. Catalogue depth policy unchanged (no Cluster B re-deepen). |

---

## Remediation map (Phases 0–5 + residuals)

### Phase 0 — Boot & perimeter
| Item | Status |
|---|---|
| Dual-flag mock rails | **FIXED** |
| Webhook HMAC-SHA256 (`v1=` + timestamp) | **FIXED** |
| `WEBHOOK_SINK_HMAC_ONLY` (reject legacy raw secret) | **FIXED** (`6dcb793`) |
| SSRF `safeFetch` + undici DNS pin fail-closed | **FIXED** |
| Crawl path DNS-pin (`ingest.fetchWithSsrfGuard` → `safeFetch`) | **FIXED** |
| Shopify / Zendesk allowlists + `safeFetch` | **FIXED** |
| Enforcing CSP; `unsafe-eval` removed | **FIXED** |
| CSP `script-src` nonce + `strict-dynamic` (no `unsafe-inline`) | **FIXED** |
| CSP `style-src 'unsafe-inline'` (next/font / Tailwind) | **PARTIAL** — accepted residual |

### Phase 1 — CI & tests
| Item | Status |
|---|---|
| GitHub Actions CI on push/PR | **FIXED** |
| Unit tests (wallet, connectors, web) | **FIXED** |
| Static eval suite gated (`staticHigh>0` fails) | **FIXED** |
| Catalog integrity (500 indexed + 51 ZA aliases) | **FIXED** — ZA packs must never be deleted |
| Gitleaks secrets scan | **FIXED** |

### Phase 2 — Persistence & scale path
| Item | Status |
|---|---|
| Postgres migrations + pool | **FIXED** |
| Prod requires `DATABASE_URL` (file fallback dual-ACK only) | **FIXED** |
| PG TLS verify-by-default; insecure needs dual ACK | **FIXED** |
| Multi-replica read-through for agents/audit | **FIXED** |
| Redis rate-limit/sessions fail-closed when configured | **FIXED** (ops: provision Redis for >1 replica) |

### Phase 3 — AI integrity
| Item | Status |
|---|---|
| Live-model shared guardrails | **FIXED** |
| Lexical knowledge retrieval | **FIXED** |
| Zod on chat/rent (+ remaining POSTs) | **FIXED** |
| Body size middleware cap | **FIXED** |
| `pnpm eval:live` (opt-in, not CI) | **LANDED** |
| Semantic / embeddings retrieval | **OPEN** (flag noted; not implemented) |
| Mock eval ≠ live quality (governance) | **DOCUMENTED** — do not conflate |

### Phase 4 — Compliance foundation
| Item | Status |
|---|---|
| Consent banner + `/api/consent` | **FIXED** |
| Privacy / terms / cookies / data-protection pages | **FIXED** (expanded drafts) |
| DSAR export + admin erase (`confirm: true`) | **FIXED** |
| AI Act-style disclosure | **FIXED** (draft) |
| ROPA / DPIA / SOC2 evidence index drafts | **LANDED** — labeled **DRAFT** |
| Counsel-signed legal / DPA / BAA | **BLOCKED** (not engineering) |

### Phase 5 — Product polish & catalogue UX
| Item | Status |
|---|---|
| SSR/SEO catalogue seed | **FIXED** |
| `agent.js` SRI (no `node:crypto` in client) | **FIXED** |
| ZA integrity CI | **FIXED** |
| ADRs / OSS notes | **FIXED** |
| Learn more: pack-derived capabilities (can / will-not / tools / examples / setup) | **LANDED** — all families via `/api/catalog/family/[id]` |

---

## Nine-risk verifier roll-up (engineering view @ `6dcb793`)

Independent Claude re-verify brief: `docs/CLAUDE_VERIFY_REMEDIATION.md`.  
Cursor engineering disposition after residual close:

| # | Risk | Disposition | Confidence |
|---|---|---|---|
| 1 | Mock-default auth | **FIXED** | High |
| 2 | Webhook signing | **FIXED** (HMAC-only enforceable) | High |
| 3 | Durable persistence | **FIXED** (ops: Redis/replica count) | High |
| 4 | SSRF gaps | **FIXED** (incl. crawl) | High |
| 5 | Secrets + pg TLS | **FIXED** (staging may dual-ACK insecure SSL until CA mounted) | High |
| 6 | CSP | **PARTIAL→mostly FIXED** — script-src nonce; style-src still `unsafe-inline` | High |
| 7 | CI/CD | **FIXED** | High |
| 8 | Validation + rate-limit | **FIXED** (zod coverage expanded; Redis fail-closed when set) | High |
| 9 | AI safety + model config | **PARTIAL** — live guardrails yes; live quality gate opt-in; no semantic retrieval | Med |

**Engineering summary:** **7 FIXED · 2 PARTIAL · 0 OPEN · 0 REGRESSED** (style-src + live-AI depth as the PARTIALs).

---

## Still open / blocked (honest residual register)

| Residual | Owner | Notes |
|---|---|---|
| Counsel-signed privacy/terms/DPA/BAA | Legal | Keep **DRAFT** labels |
| SOC 2 / ISO / formal certs | GRC | Evidence index only |
| Semantic embeddings retrieval | Eng | Lexical only today |
| Nightly live-LLM quality as hard gate | Eng/ML | `eval:live` exists; not in CI |
| Multi-replica Redis on Railway | Ops | Code ready; must provision |
| Verifiable Postgres CA (drop SSL dual-ACK) | Ops | Staging may use `PG_SSL_REJECT_UNAUTHORIZED=0` + ACK |
| Azure Container Apps cutover / Key Vault | Ops/Cloud | Bicep present, Railway is prod today |
| Partner OIDC + real wallet | Partner | Staging may still use dual-ACK mock rails |
| CSP `style-src` without `unsafe-inline` | Eng | next/font + Tailwind follow-on |
| Deeper catalogue beyond Cluster B policy | Product | Do **not** re-deepen Cluster B without decision |

---

## Catalogue & product UX (customer-facing)

| Fact | Value |
|---|---|
| Indexed SKUs | **500** (100 families × 5 markets) |
| On-disk packs | **551** = 500 + **51 ZA aliases** (`markets.za` → africa packs) — **never delete unprefixed ZA JSON** |
| Learn more | Per-family capability brief from pack tools/guardrails/evals (not a one-line summary) |
| Staging | Health expected `storeBackend: postgres` when `DATABASE_URL` set |

---

## Revised top-line ratings

| Metric | Baseline | Updated |
|---|---|---|
| Overall architecture | 7.5 / 10 | **8.0 / 10** |
| Scalability | 33 / 100 | **55 / 100** |
| Security maturity | 63 / 100 | **78 / 100** |
| AI maturity | 55 / 100 | **62 / 100** |
| Enterprise readiness | 45 / 100 | **58 / 100** |
| Testing | 40 / 100 | **70 / 100** |
| DevOps | 52 / 100 | **74 / 100** |
| Production readiness | ~50 / 100 | **~68 / 100 (pilot)** |
| Overall code quality | 71 / 100 | **74 / 100** |
| **Engineering score / grade** | **61 · B–** | **72 · B** |

---

## Investment / diligence implication

| Question | Answer now |
|---|---|
| Is the IP real? | **Yes** — agent-package format, connector/OAuth engine, multi-market catalogue, eval culture |
| Was the baseline “demo shell” fair? | **Yes** — and largely **remediated in-repo** |
| Ready for uncontrolled enterprise RFP? | **No** — counsel + certs + live-LLM quality program still required |
| Ready for pilot / staging customers with clear dual-ACK staging flags? | **Yes, with eyes open** |
| Biggest remaining fundable workstreams | (1) Compliance counsel + assurance, (2) live-LLM eval as continuous quality, (3) semantic retrieval + deeper packs by policy, (4) multi-replica ops (Redis/HA) |

---

## Key source pointers

| Topic | Path |
|---|---|
| Baseline audit (full narrative) | `docs/reports/technical-audit-2026-08-02.md` |
| Residual close | `docs/reports/residual-punchlist-close-2026-08-02.md` |
| Verifier punch-list | `docs/reports/verifier-punchlist-2026-08-02.md` |
| Claude re-verify brief | `docs/CLAUDE_VERIFY_REMEDIATION.md` |
| CI | `.github/workflows/ci.yml` |
| SSRF | `packages/connectors/src/ssrf.ts` |
| Crawl SSRF | `apps/web/src/lib/ingest.ts` |
| Store read-through | `apps/web/src/lib/store.ts` |
| CSP nonce | `apps/web/src/lib/csp.ts`, `apps/web/src/middleware.ts` |
| Zod bodies | `apps/web/src/lib/api-schemas.ts` |
| Live eval | `scripts/eval-live.mjs` (`pnpm eval:live`) |
| Learn more capabilities | `apps/web/src/lib/family-capabilities.ts` |
| Compliance drafts | `docs/compliance/*` |

---

## Document control

| | |
|---|---|
| Classification | Confidential — technical diligence |
| Authors | Cursor (remediation implementer) — engineering disposition; independent Claude verify may supersede the 9-risk table |
| Baseline | Static audit @ `d4cfea2` |
| This update | Post Phases 0–5 + residual punch-list @ `6dcb793` |
| Next refresh | After counsel sign-off and/or Claude `remediation-verify-YYYY-MM-DD.md` |

*Scores are engineering judgments calibrated to in-repo evidence. Ops/partner/legal items are called out as blocked or residual, not silently marked FIXED.*
