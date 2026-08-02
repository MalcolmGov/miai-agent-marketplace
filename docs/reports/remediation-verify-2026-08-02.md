# Remediation verification — Phases 0–5 + punch-list — 2026-08-02

**Verifier:** Claude (independent of Cursor) · **Brief:** `docs/CLAUDE_VERIFY_REMEDIATION.md`
**Pin SHA:** `63f37181c877b665d99e65ce293d7c5c1368b409` (`63f3718`) — latest `origin/main`; supersedes stale pin `2a40d34`.
**Baseline (pre-remediation):** `d4cfea2`. **Method:** 10 adversarial verifiers (per-risk, read-the-diff) + local gate run + staging probe. MockModel pass-rate is **not** treated as live-LLM quality.

---

## 1. Verdict — core 9 risks

> **5 FIXED · 4 PARTIAL · 0 OPEN · 0 REGRESSED**

Up from `2a40d34` (2 FIXED · 7 PARTIAL). Every remaining PARTIAL is a **bounded, in-repo residual** with the catastrophic element eliminated — no risk is OPEN, and remediation introduced **no regressions**. The previously-flagged new defect (building-management grounding contradiction) has been corrected.

## 2. Pin + environment gates

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` · `build:packages` · `typecheck` | ✅ pass |
| `pnpm test` | ✅ **61 pass / 0 fail** (wallet 5 · connectors 21 · web 35) |
| `pnpm catalog:integrity` | ✅ index 500 · families 100 · 551 on disk · **51 ZA aliases preserved** |
| `pnpm eval:suite:static` | ✅ complete, drift=0 *(static-only; not a live-LLM signal)* |
| **Staging `/api/health`** | ✅ `status: ok` · `storeBackend: postgres` · `storePing: ok` · `store: hydrated` · `hardening: ok` · `modelMode: anthropic` |

Staging shows `authMode: mock` / `mockRailsAllowed: true` — the **documented dual-ACK staging escape hatch**, not a customer-prod exposure. Durable Postgres persistence is confirmed **live** on staging (Phase 2 / punch-list durability is deployed, not just coded).

---

## 3. Per-risk table

| # | Risk | Verdict | Conf. | Key evidence (file:line @ `63f3718`) |
|---|---|---|---:|---|
| 1 | Mock-default auth | ✅ **FIXED** | 93% | `auth.ts:49-59` elevated default = dual-flag AND, else `readonly`; `security-flags.ts:77-120` XOR half-hatch fail; `:211-224` boot throws; `instrumentation.ts:5-8`; 13/13 boot tests |
| 2 | Webhook signing | ⚠️ **PARTIAL** | 85% | `webhook-sig.ts:20-22` HMAC over `ts.body`; `:36-41` skew+constant-time; `handlers/webhook.ts:10-24` sign on send; `sink/route.ts:84-104` verify — **residual:** `:89,:101` `allowLegacyRawSecret:true` hardcoded |
| 3 | Durable persistence | ⚠️ **PARTIAL** | 80% | `store.ts:195-206` row upsert `ON CONFLICT`; `:210-215` append audit; `pg.ts` pool; `migrations/0001`; prod requires `DATABASE_URL` (dual-ACK file fallback) — **residual:** hydrate-once Map (`:255,265,284`) → multi-replica read incoherence |
| 4 | SSRF gaps | ⚠️ **PARTIAL** | 88% | MCP·Woo·**Shopify·Zendesk**·webhook all via `safeFetch`; `ssrf.ts` undici DNS-pin **fail-closed** (throws w/o undici) — **residual:** `ingest.ts:174` crawl validated-but-not-pinned (DNS-rebinding TOCTOU on that one path) |
| 5 | Secrets + pg TLS | ✅ **FIXED** | 90% | `pg.ts`/`tokens.ts` `sslFor()` verifies certs by default in prod; insecure needs **dual ACK** (`PG_SSL_REJECT_UNAUTHORIZED=0` + `I_UNDERSTAND_PG_SSL_INSECURE`), `security-flags.ts:144-151`; weak secrets fail closed |
| 6 | CSP | ⚠️ **PARTIAL** | 93% | `next.config.ts` — `unsafe-eval` **removed** (verified vs baseline) — **residual:** `unsafe-inline` remains in script/style-src (2 nonce-less layout boot scripts; nonce/strict-dynamic deferred) |
| 7 | CI/CD | ✅ **FIXED** | 92% | `.github/workflows/ci.yml` push+PR, no `continue-on-error`; eval-suite exits non-zero on **`staticHigh>0`** (tightened in `ed22434`); critical dep-audit blocking; gitleaks content scan |
| 8 | Validation + rate-limit | ✅ **FIXED** | 90% | zod (+max-lengths) on chat/rent/embed/ask + `/api/v1`; `Content-Length` cap → 413 in middleware; Redis rate-limit **fails closed** → 429 — residual: 15 auth-gated POST handlers still unschema'd (bar-acknowledged) |
| 9 | AI depth + model config | ✅ **FIXED** | 88% | `runtime/index.ts` wires manifest `model.fallback`/temp/max into live adapters; new `guardrails.ts` shared layer short-circuits **live+mock**; new `knowledge-retrieve.ts` lexical retrieval; building-management grounding now matches KB |

**Extra (Phase 4) — not in core 9:** Compliance ✅ **FIXED** (90%) — admin-gated confirm-required **DSAR erasure** route (in-memory + Postgres), EU AI-Act **Art.50 disclosure** in embed + chat UI, `/privacy` `/terms` `/cookies` + consent banner (all honestly labeled **DRAFT**). Residual is **blocked** (legal-counsel finalization; append-only Postgres audit rows retained un-redacted, truthfully disclosed by the erase notice).

---

## 4. Phase roll-up

| Phase | Commits | Status |
|---|---|---|
| **0** — dual-flag mock, SSRF/HMAC start, CSP start, secrets | `4f2cce6` `6b5f2f0` | ✅ **held** — auth FIXED, secrets FIXED, webhook/SSRF cores met |
| **1** — CI + unit tests + static evals | `30e0ed0` | ✅ **held** — CI FIXED, `staticHigh>0` now reddens |
| **2** — Postgres pool/upserts, Redis, catalogue memo | `f0fb3a3` `2a40d34` | ⚠️ **held w/ residual** — durable + row-level; multi-replica read cache incoherent |
| **3** — live-LLM guardrails, retrieval, zod `/api/v1` | `32fb0ce` | ✅ **held** — shared guardrails run live+mock; validation FIXED; retrieval lexical (not embeddings) |
| **4** — privacy/consent/DSAR, AI-Act disclosure | `67b75a7` | ✅ **held** — routes+pages exist, drafts labeled; legal copy blocked on counsel |
| **5** — SSR/SEO, SRI client-safe split, ZA integrity, ADRs | `6e0716b` `88e1d27` | ✅ **held** — SRI server-computed, client `node:crypto`-free; catalog integrity 500/51; CSP `unsafe-inline` residual |
| **Punch-list** — TLS default-verify, Shopify/Zendesk safeFetch, body caps, CI tighten, grounding | `ed22434` | ✅ **held** — TLS FIXED, connector SSRF FIXED, body-cap FIXED, `staticHigh>0` FIXED, grounding corrected |

---

## 5. Residual punch-list (PARTIAL only)

| Item | Owner | Fix |
|---|---|---|
| Webhook sink hardcodes `allowLegacyRawSecret:true` — HMAC-only not enforceable | **in-repo** | env flag (e.g. `WEBHOOK_SINK_HMAC_ONLY`) → pass `allowLegacyRawSecret:false` once senders migrated |
| Persistence: per-replica hydrate-once Map → stale reads on >1 replica | **in-repo** | read-through / pub-sub invalidation, or serve reads from Postgres (single-replica today, so latent) |
| SSRF: `ingest.ts:174` crawl path validated but not DNS-pinned | **in-repo** | route crawl through `safeFetch` (undici pin) like the connectors |
| CSP: `unsafe-inline` remains (script + style) | **in-repo** | per-request nonce middleware + apply to the 2 layout boot scripts (App-Router-safe) |
| Compliance: draft legal copy; append-only audit rows un-redacted on erase | **blocked** | legal-counsel finalization of privacy/terms/DPA; decide audit-redaction policy |
| Validation: 15 auth-gated POST handlers still unschema'd | **in-repo** | extend zod coverage (lower risk — all behind auth+role) |
| Live-LLM eval harness (no answer-injection) still missing; retrieval lexical not semantic | **in-repo** | live-model eval job; embeddings for retrieval (audit's future-need item) |

## 6. Regressions

**None.** No verifier found a defect introduced by the remediation. The prior-round new issue (building-management `## Eval grounding` contradicting its KB) is **resolved** — grounding now reads 1-bed R1,450 / 2-bed R1,980 / special levy R500, matching the body.

---

## Sign-off

At `63f3718`, the platform's Phases 0–5 remediation is **substantially verified**: 5 of 9 audit risks fully closed, 4 partially closed with bounded in-repo residuals, none open, no regressions, all local gates green, and durable Postgres persistence confirmed live on staging. The remaining work is a short, well-understood in-repo punch-list plus counsel-blocked legal finalization — no architectural blockers. **MockModel eval pass-rate is not a live-LLM quality attestation**; a live-model eval harness remains the top AI-integrity follow-up.

*Static analysis + staging probe, no destructive actions. ZA packs preserved; Cluster B untouched.*
