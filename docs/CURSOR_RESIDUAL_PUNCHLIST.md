# Cursor task — close the in-repo residuals from remediation verification

**Owner:** Cursor
**Source of truth:** `docs/reports/remediation-verify-2026-08-02.md` (verified at pin `63f3718`: core-9 = 5 FIXED · 4 PARTIAL · 0 OPEN · 0 REGRESSED)
**Goal:** convert the remaining **PARTIAL** verdicts into **FIXED** by closing the bounded in-repo residuals below. Each task lists exact file:line, the fix, and an acceptance test (CI now gates tests + `staticHigh>0`, so add the test).

## Guardrails (do not violate)
- **Never delete unprefixed `data/catalog/*.agent.json`** — those 51 files are ZA market packs (`markets.za`), not orphans. Only `* 2.json` Finder junk is deletable.
- **Do not re-deepen Cluster B** (`restaurant-takeaway · salon-booking · clinic-front-desk · customer-support · delivery-tracking · trades-receptionist`).
- **MockModel eval pass-rate is not live-LLM quality** — don't claim it as such.
- Keep the CI gate green (`pnpm run ci`). Add a unit test with each fix.
- Surgical fixes only; don't refactor unrelated code.

---

## P1 — security-relevant (do first)

### 1. SSRF: DNS-pin the knowledge-crawl path
- **Where:** `apps/web/src/lib/ingest.ts:174` — `fetchWithSsrfGuard` validates each hop via `assertSafeOutboundUrl` then issues a **bare `fetch`**, which re-resolves DNS at connect time → DNS-rebinding TOCTOU (a low-TTL domain passes validation on a public IP, then rebinds to `169.254.169.254`/loopback/private).
- **Fix:** route the crawl fetch through the same `safeFetch` used by the connectors (`packages/connectors/src/ssrf.ts`), which pins the connection to the pre-validated address via the undici agent `connect.lookup` override and is fail-closed if undici is unavailable.
- **Accept:** a test proving a hostname that resolves public-then-private is rejected at fetch time (mirror `packages/connectors/test/ssrf.test.mjs`); crawl still works for a normal public URL.

### 2. Webhook sink: make HMAC-only enforceable
- **Where:** `apps/web/src/app/api/webhook/sink/route.ts:89,101` — `allowLegacyRawSecret: true` is hardcoded in both verify branches, so an operator cannot require HMAC-over-body; a caller who knows the raw secret bypasses timestamp/replay + payload binding. (`verifyWebhookSignature` already supports `allowLegacyRawSecret:false`; no caller passes it.)
- **Fix:** add env flag `WEBHOOK_SINK_HMAC_ONLY` (default keep legacy for one release) → pass `allowLegacyRawSecret: !hmacOnly`. Document in `.env.example` and `docs/RAILWAY_DEPLOY.md`.
- **Accept:** test that with `WEBHOOK_SINK_HMAC_ONLY=1` a valid raw-secret-only POST is `401` while a correctly HMAC-signed POST is accepted; default behaviour unchanged.

### 3. CSP: remove `unsafe-inline` via per-request nonce
- **Where:** `apps/web/next.config.ts` CSP still has `unsafe-inline` in `script-src` + `style-src`; driven by two nonce-less `dangerouslySetInnerHTML` boot scripts in `app/layout.tsx`.
- **Fix (only if App-Router-safe):** per-request nonce in `middleware.ts`, inject into the CSP header, apply the nonce to the two boot scripts (and any styled-jsx/font inline styles). If a clean nonce/`strict-dynamic` migration isn't landable without breaking App Router, **leave it and say so** — the brief allows deferring this one.
- **Accept:** enforcing CSP no longer contains `unsafe-inline` in `script-src`; app renders with no CSP console violations in a smoke check.

---

## P2 — robustness

### 4. Persistence: multi-replica read coherence
- **Where:** `apps/web/src/lib/store.ts:255,265,284` — the rentals/audit store hydrates from Postgres **once per replica** (`hydrated` flag) and serves all reads from that per-replica in-memory `Map`; writes go row-level to Postgres + local memory but there is **no cross-replica invalidation**. On `>1` replica, a write on replica A is invisible to replica B until restart. (Latent today — Railway runs a single replica.)
- **Fix (pick one):** (a) serve reads through Postgres (drop the read cache), or (b) short-TTL cache + Redis pub/sub invalidation on write (Redis is already wired for rate-limit/sessions). Prefer (a) for correctness unless read latency demands (b).
- **Accept:** a test/harness showing a write via one store instance is visible to a second instance without restart; single-replica behaviour unchanged.

### 5. Validation: cover the remaining auth-gated POST handlers
- **Where:** 15 mutating POST handlers still `req.json()` with no zod schema: `connectors`, `connectors/credentials`, `configure`, `consent`, `wallet`, `mcp/tools/call`, `dsar/erase`, `knowledge/paste`, `knowledge/crawl`, `slack/channels`, `custom-requests[/id]`, `workspace/members[/userId]`, `oauth/[connector]/disconnect`.
- **Fix:** add zod schemas (with `.max()` string bounds) mirroring the chat/rent pattern already in the repo. Lower risk (all behind auth+role) but closes the validation gap.
- **Accept:** each handler rejects malformed/oversized bodies with `400`; add contract tests to `apps/web/test/api-contract.test.mjs`.

---

## P3 — AI integrity (larger; scope separately if needed)

### 6. Live-LLM eval harness + semantic retrieval
- **Why:** the 95.8%/96.6% eval pass-rate + `staticHigh=0` come from the deterministic MockModel plus hand-tuned answer-injection (`runtime/index.ts` `knowledgeHit`), so they validate routing/guardrails, **not** live-model answer quality. Retrieval (`knowledge-retrieve.ts`) is lexical keyword-overlap, not embeddings.
- **Fix:** (a) a **live-model** eval job (small sampled set, no answer-injection, API-key-gated, nightly not blocking) to measure real answer quality; (b) optionally add an embeddings/semantic retrieval path behind a flag.
- **Accept:** a runnable live-eval script + a short report of live pass-rate vs mock; clearly separated from the mock gate.

---

## Out of Cursor's scope (blocked)
- **Compliance legal copy** (privacy/terms/cookies, DPA/BAA, ROPA/DPIA) — labeled DRAFT; requires legal counsel, not an engineering fix. Leave labeled DRAFT.

---

## Deliverable
For each task: the fix + its test, and update `docs/reports/remediation-verify-2026-08-02.md`'s residual table (or a new dated note) marking the item closed. When P1+P2 land, ping Claude to re-run the 9-risk verifier pass (`docs/CLAUDE_VERIFY_REMEDIATION.md`) for a fresh sign-off.
