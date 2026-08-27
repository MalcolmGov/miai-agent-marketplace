> **STATUS (2026-08-27): ALL 11 P0s SHIPPED & MERGED (#110–#117).** This is the recovered
> full plan from the 27-Aug "solidify our side" multi-agent audit (its scratch copy was lost).
> The P0 sections below are DONE. The P1/P2 sections are the live backlog. Execution notes:
> P0-6 shipped as connector-preflight badge/notice (core #116 + UI #117); P0-10 shipped the pool
> error handler (P2-7 pool *timeouts* still pending); P0-4 added the pre-turn balance gate (P1-13's
> affordability *estimate* still pending). Autonomous-safe items being worked in focused PRs;
> items that flip prod defaults, need new prod secrets/infra, or run DB migrations are deferred
> for an explicit decision (P1-1 deploy gate, P1-3 require-Upstash, P1-5 webhook default, P1-6b
> lazy-decrypt, P1-9/10/11 consumer privacy + migrations, P2-1/2 token-envelope/secrets,
> P2-10/11 retention/namespacing).

# MyInstantAI Production Hardening Plan — Our Side (App / Runtime / Connectors / Tests)

Consolidated from six per-dimension audits (boot-security, connectors-correctness, safety-guardrails, resilience-ops, billing-metering, multitenant-privacy, test-ci-coverage). Scope is our code only — Azure/identity/wallet partner infra is explicitly out of scope; where our code must *survive* partner-infra failure, that survival is in scope.

45 raw findings deduped to **11 P0 · 13 P1 · 11 P2**. Overlaps were merged (timeouts+handler-retry; migrations+liveness/readiness; input-bypass+workflow-output-scrub; two probe gaps; two token-blast-radius gaps; two DSAR gaps; brief/transcript scoping; the whole test cluster).

### Named program items — quick placement
| Item | Tier | Where |
|---|---|---|
| Connector go-live **PREFLIGHT** gate | **P0-6** | `rent`/`configure` routes, AgentStudio |
| Arbitrary-language **SAFETY CLASSIFIER** | **P0-8** | `runtime/guardrails.ts` |
| **#106 uncounted re-voice** model call | **P0-3** | `runtime/index.ts` finishWorkflow |
| **MIGRATIONS** at-boot vs first-request | **P1-1** | merged into liveness/readiness split |

---

## What's already solid (do not relitigate)

- **Boot fail-closed:** `assertBootHardening()` throws in prod on weak secrets / mock rails / missing Postgres; dual-flag escape hatches; leaked-`SANDBOX_MODE=1`-next-to-real-rails refuses to boot. This is what keeps the shared demo identity out of real prod.
- **Egress:** SSRF scheme allowlist + resolved-IP private/metadata blocks + undici DNS-pinning that fails *closed*; webhook HMAC-SHA256 with skew rejection and timing-safe compare; per-hop redirect re-validation.
- **Token-at-rest:** AES-256-GCM v2 envelope, per-value IV + verified tag; OAuth state HMAC + PKCE S256; audit/DSAR redaction; no token/PII in logs.
- **Connector honesty scaffolding:** sandbox stub forcing is belt-and-suspenders; `executeLive` never throws to the runtime; email read/write intent separated; `withRetry`+`safeFetch` on mcp/webhook; internal tools degrade honestly.
- **Wallet contract:** adapter-level idempotency (unit-tested), 402/409 → non-throwing paused result, top-up idempotent on Paystack ref, 15s AbortController; live metering prefers provider usage and sums tool-rounds; zero-balance hard gate.
- **Multitenant core:** consumer identity fail-closed/non-forgeable; memory/life-graph/reminders consistently `(tenant_id, consumer_id)`-scoped; Telegram line hardened (mandatory secret, single-use nonce, private-only); B2B DSAR properly tenant+admin scoped.
- **Resilience baseline:** `/api/health` does real `SELECT 1`/`PING` probes; App Insights posting is non-blocking; rate limiter fails closed on Upstash INCR error; migrations idempotent + single-flighted; retry classification correct; Railway healthcheck + `ON_FAILURE` restart.
- **Tests/CI:** unit coverage across all 5 packages in the blocking job; zero-token eval harness (static gate + nightly); strong guardrail + SSRF/oauth/retry suites; live-eval findings locked against regression; secrets/gitleaks gate; tiered Playwright e2e vs staging.

---

## P0 — Must fix before customer production

**P0-1 · Stable per-turn debit idempotency key** — *S* — `runtime/src/index.ts`, `apps/web/src/lib/consumer-turn.ts`
Replace `${ws}:${agent}:${Date.now()}:${messages.length}` (≈L2322/L2922) with a key derived from turn identity (hash of `workspaceId+agentId+sessionId+turnIndex`, or reuse the `correlationId` already threaded through consumer-turn). **Why:** `Date.now()` changes every call, so the adapter dedup never matches — a retried/replayed turn (Telegram webhook double-invoke, serverless double-fire, client resend) **double-charges** the wallet. Ship with the double-debit concurrency test.

**P0-2 · Workflow debit path must honor `debit.ok`** — *S* — `runtime/src/index.ts`
`finishWorkflow` hardcodes `paused:false` and `tokensDebited: tokens` regardless of `debit.ok` (≈L2383-2386). Mirror the main path (`paused = !skipDebit && (!debit.ok || debit.paused)`, zero `tokensDebited` on failure, set `paused_no_tokens`). **Why:** with balances gated only at `<=0` and all-or-nothing debits, a workspace with positive-but-insufficient balance gets an `ok:false` debit that deducts nothing, is never paused, balance never drops — so **every subsequent grounded-workflow turn is served free forever** (executive-assistant, booking, restaurant, dental, hotel, pharmacy, IT-helpdesk…) while the audit log falsely reports it as charged.

**P0-3 · Meter the #106 localize re-voice call** — *M* — `runtime/src/index.ts` — **[NAMED]**
Debit is computed from the English grounded answer (≈L2312-2316) and executed at ≈L2319; then for any non-English grounded turn a second real `model.complete()` re-voices (≤700 out tokens, ≈L2341-2356) and its `localized.usage` is **discarded**. Capture `localized.usage` into the debit, or move the debit to after localization. **Why:** every non-English grounded turn is under-billed by ~one full model call, systematically, on the headline multilingual feature — margin erosion that scales with international adoption.

**P0-4 · Guard `wallet.getBalance`/`debit` inside `runTurn`** — *M* — `runtime/src/index.ts`, `packages/wallet-adapter/src/index.ts`
Both are awaited with no try/catch (≈L2262, L2319/L2919); `HttpWalletAdapter` throws `Wallet API <status>` on any non-402/409. Wrap with an explicit policy: on transient 5xx/timeout *after the model already answered*, record a pending/unreconciled ledger entry and serve the answer (fail-open) rather than 500-ing and discarding both answer and charge; bounded retry + jitter on transient 5xx. **Why:** a partner wallet-gateway blip currently crashes the turn after model spend — user 500, answer discarded, usage never debited, no reconciliation record. This is the core "fail safely around partner infra" mandate (promoted from P1: it's on the money path *and* an availability defect). Ship with the wallet-down/store-down failure-injection test.

**P0-5 · Stop fabricating success in live mode for unconnected connectors** — *M* — `packages/connectors/src/live/execute.ts`, `apps/web/src/app/api/chat/route.ts`
When a bound OAuth connector has no valid token and `mode==="live"`, `stubFor()` still returns fabricated success (`place_order→{status:"placed",reference:"ORD-3391"}`, `create_ticket→TKT-9102`, `book_table→confirmed TBL-4821`) with `ok:true` and only a buried `_note` (≈L1942-1956). Gate all fabricated-success stubs to sandbox only; in live mode return `ok:false`/`not_connected` with **no success fields** for write/action tools; separate read-ish from write tools. **Why:** a live takeaway/booking agent whose grant is missing or revoked mid-life tells a real customer their order/booking was placed when nothing happened. Runtime backstop that must exist *even after* the preflight gate (tokens revoke mid-life).

**P0-6 · Connector go-live PREFLIGHT gate** — *M* — `rent/route.ts`, `configure/route.ts`, `AgentStudio.tsx`, `agents/[id]/route.ts`, `assistant-capabilities.ts` — **[NAMED]**
Add a server-side preflight: `required` from `resolveBindings(pkg)/preset.bindings`, `missing = required − listConnected(workspaceId)`, then block the transition to rented/live or force an explicit "go live degraded" override with a visible badge. Today `rent` creates the rental with zero binding check, `configure` trusts a **client-supplied** `connectedConnectors` array and flips to "rented" unverified, the studio gate is a loose heuristic, `agents/[id]` returns *all* connectors, and `ActionsPanel` uses a hardcoded list. The `unmetConnectorLabels` building block already exists and just needs wiring. **Why:** agents currently rent and go live with unbound/unconnected connectors — the first customer interaction is the first time anyone learns the agent can't act. Layers with P0-5 (preflight = launch gate, stub-honesty = runtime backstop).

**P0-7 · Gate every turn — including workflow-handled turns — through the shared input + output guardrails** — *M* — `runtime/src/index.ts`
`checkInputGuardrails` runs at ≈L2707, *after* ~20 workflow dispatch points that each `return done`; and `finishWorkflow` returns before `checkOutputGuardrails` (≈L2900), so workflow replies get only `scrubLeakedPlaceholders`. Move the input check to run right after the balance check and *before* the first workflow dispatch (or at the top of `finishWorkflow`), and call `checkOutputGuardrails` on `handled.assistantMessage` inside `finishWorkflow`. **Why:** a self-harm / card / OTP / emergency message a workflow claims for its own intent (delivery-tracking, gym, hotel, events-venue) gets none of the shared refusals/handoffs (only 8 of ~22 workflow files reference any safety keyword); and workflows interpolate live connector payloads (mobile-money float, pharmacy RX) into user text unscrubbed. *Merges two safety findings — same root cause, same file.*

**P0-8 · Arbitrary-language safety classifier** — *L* — `runtime/src/guardrails.ts`, `runtime/src/workflows/i18n.ts` — **[NAMED]**
`checkInputGuardrails` detects self-harm/emergency/gas-leak/intruder/card/OTP only in en/es/fr keywords, but the runtime advertises "every major language" and ships localized emergency strings for 8 (de/it/zh/hi/sw). Add a lightweight model-based classifier (self-harm / medical-emergency / physical-hazard / secret-disclosure) running language-agnostically *ahead* of the keyword net (keyword net kept as the zero-cost fast path); feed its verdict into the existing `handoff()`/refusal paths so localized `wf()` responses are reused. **Why:** a suicide, gas-leak, or "here's my card / share the OTP" message in German/Chinese/Hindi/Swahili/Arabic/Portuguese passes straight through today — the code comment itself defers this to a classifier. **Longest pole — start in parallel at the beginning.**

**P0-9 · Incremental scrub on the streaming output path** — *M* — `runtime/src/index.ts`, `runtime/src/guardrails.ts`
`modelAnswer` streams every delta via `onDelta` as it arrives (≈L263), but `checkOutputGuardrails` runs only on the assembled completion (≈L2900) and merely replaces the final value. Buffer a trailing window on the `onDelta` path and match PAN/OTP/PIN/system-prompt-dump as tokens accumulate, holding/masking a delta until proven safe. **Why:** on any surface that renders streamed deltas (B2B `/api/chat` + `chat-stream.ts` do), a leaked card/OTP/PIN or a jailbroken prompt dump is shown token-by-token *before* the scrub fires — the last line of defense is a no-op for streaming. (Promoted from P1; conditional-P0 that is unconditional if streaming ships.)

**P0-10 · Postgres pool `error` handler** — *S* — `apps/web/src/lib/pg.ts`
`getPool()` builds `new pg.Pool(...)` with no `pool.on('error', …)`. Add `pool.on('error', err => trackException(err, {source:'pgPool'}))` right after construction. **Why:** node-postgres emits `error` on idle clients when managed Postgres (Neon/Railway) drops idle conns or fails over — routine behavior. A zero-listener EventEmitter `error` is re-thrown by Node and **takes down the whole process** — a full outage from normal idle-disconnect. One line.

**P0-11 · Timeouts (+ abort-between-retries + dependency telemetry) on model and connector fetches** — *M* — `runtime/src/index.ts`, `connectors/src/ssrf.ts`, `connectors/src/live/execute.ts`, `connectors/src/live/handlers/slack.ts`, `connectors/src/retry.ts`
`fetchProviderWithRetry()` calls `fetch` with no `AbortSignal`; `safeFetch()` and `slack.ts` have none; the ~20 inline provider handlers use bare `fetch` with no timeout/retry. Add per-attempt `AbortSignal.timeout` (~10–20s model, ~10s connectors), abort between retries, route idempotent GETs through `withRetry`, and wrap these calls in `trackDependency` (same call sites — folds in a resilience-P2). **Why:** a hung Azure OpenAI / gateway / customer MCP / connector blocks the request with no bound — up to 3× under retry — pinning request slots into platform-wide unresponsiveness; the model call is the hottest path. *Merges resilience-P0 + connectors-P2.* **Caveat:** retry only idempotent GETs — writes need P1-4 first.

---

## P1 — Should fix

**P1-1 · Split liveness/readiness and move MIGRATIONS into the promotion gate** — *M* — `instrumentation.ts`, `migrate.ts`, `health/route.ts`, `railway.toml` — **[NAMED]**
Two merged findings, one remediation. (a) `register()` deliberately does **not** run migrations (they run lazily on first hydrate), so a deploy whose migration would fail still passes `/api/health` and gets promoted, surfacing only as a 503 under traffic. (b) `/api/health` returns **200** even when required partner config (oidc issuer / wallet url / gateway url) is absent, yet Railway uses it as the promotion gate. Keep a liveness probe (200 while the process is up); add a readiness probe that runs `ensureMigrations()` + config-completeness and returns non-200 until both pass; point the promotion gate at readiness. Also harden `splitStatements()` — the naïve `;` split will corrupt any future dollar-quoted function/trigger body (safe only because all 7 current migrations are plain DDL).

**P1-2 · Graceful shutdown on SIGTERM** — *M* — `instrumentation.ts`, `pg.ts`
No `process.on('SIGTERM'/'SIGINT')`; `pool.end()` is never called. Add a handler that stops new work, drains in-flight briefly, then `pool.end()`. **Why:** every rollout SIGTERMs and kills the container abruptly — user-visible 5xx on active chat turns on *every deploy*, plus DB connections dropped without clean close, leaving server-side conns lingering on managed Postgres.

**P1-3 · Require Upstash rate limiting in production (fail closed)** — *M* — `security-flags.ts`, `security.ts`
Without Upstash, `rateLimit()` falls back to a per-instance Map and boot only warns; on multi-replica Railway the public unauthenticated chat limits (consumer/app/ask/embed, 30/min) are per-instance and "largely bypassable at scale" (per the code comment). Escalate to a hard boot requirement in prod non-mock behind a dual-ack hatch mirroring `ALLOW_MOCK_RAILS`. **Why:** these are the abuse/cost/DoS caps on unauthenticated LLM-spend endpoints.

**P1-4 · Idempotency keys for side-effectful connector POSTs** — *M* — `connectors/src/live/handlers/webhook.ts`, `mcp.ts`, `retry.ts`
`webhook`/`mcp` wrap POSTs (`place_order`, `book_table`, …) in `withRetry()` with no idempotency key. Derive one (`workspaceId+agentId+tool+args` hash) the endpoint can dedupe on, or classify non-idempotent verbs as non-retryable. **Why:** a 5xx-after-commit or a network blip between commit and response duplicates the order/booking on retry. **Precondition for enabling connector retries from P0-11.**

**P1-5 · Invert the webhook-sink legacy raw-secret default in prod** — *S* — `webhook-sink-auth.ts`, `webhook/sink/route.ts`, `connectors/src/webhook-sig.ts`
`webhookSinkAllowLegacyRawSecret()` returns true unless `WEBHOOK_SINK_HMAC_ONLY=1`, and verification then does plain `signature===secret` with no timestamp/replay/body binding — the "signature" **is** the shared secret in cleartext. Force `allowLegacyRawSecret=false` whenever `sinksRequireSecret()`; raw-secret opt-in for local/dev only. **Why:** capturing one legacy delivery yields the secret verbatim → forge/replay sink events.

**P1-6 · Reduce OAuth-token blast radius** — *M* — `packages/connectors/src/oauth/tokens.ts`
Two merged findings, same file. (a) `saveToken()` writes Postgres **and** unconditionally mirrors sealed tokens to `data/oauth-tokens.json` (0644) even when `DATABASE_URL` is set — gate file persistence to only when no Postgres pool is active. (b) `hydrateFromPostgres()` decrypts **every** tenant's tokens into a process-global Map on first access, mirrored on every replica — keep values sealed and `open()` only at point of use, or move to targeted per-`(workspace,connector)` queries with short TTL. **Why:** both turn one path-traversal / stray-backup / heap-dump bug into a full cross-tenant token compromise.

**P1-7 · Treat connector output and tenant KB as untrusted (prompt injection)** — *M* — `runtime/src/index.ts`, `runtime/src/guardrails.ts`
Tool results are `JSON.stringify`'d into `role:'tool'` messages and the model is told to answer from them; tenant KB is embedded verbatim in the system prompt. Input guardrails inspect only `req.userMessage`, and the output prompt-dump branch is gated on `userMessage` matching jailbreak patterns — so "ignore previous instructions / reveal your prompt / exfiltrate" via connector data or an uploaded KB doc evades both. Fence tool/KB content as data-not-instructions, scan tool-result content for injection, and decouple the output prompt-dump detector from `userMessage`. **Why:** third-party/connector content can drive injection + system-prompt exfiltration on a multi-tenant runtime.

**P1-8 · Expand connector health probers (Microsoft email + high-value connectors)** — *M* — `packages/connectors/src/oauth/probe.ts`
Two merged findings. `PROBERS` covers only slack/google_calendar/hubspot/email; every other action connector returns `probe_not_supported` and records nothing, so wrong scope/shop/subdomain/expired grant surfaces only at first customer failure. And `PROBERS.email` is hardwired to `gmailProbe`, so a Microsoft mailbox (Graph token) 401s → false `verify_status:"failed"` and a bogus "reconnect Email" prompt. Branch the email prober on stored `emailProvider` (Gmail `users.profile` vs Graph `/me`), thread token meta through `probeOAuthConnector`, and add read-only probers (Shopify `orders?limit=1`, m365 `/me`, Zendesk `/users/me`, Calendly `/users/me`, Stripe `/v1/balance`, WhatsApp phone-number id, Xero/QuickBooks org).

**P1-9 · Consumer-facing DSAR (export + erase) covering all consumer stores** — *M* — `dsar/export/route.ts`, `dsar/erase/route.ts`, `consumer-auth.ts`, `dsar-erase.ts`, `consumer-memory-store.ts`, `consumer-brief-store.ts`
Two merged findings. Add `/api/consumer/dsar/export` + `/erase` behind `requireConsumer`, scoped by `(tenantId, consumerId)`: memory, goals, people, reminders, brief, transcripts (`miai_turns` by `workspace_id=walletId`), connector tokens, session bag. And extend erasure to actually delete `miai_consumer_memory/goal/person/reminder/brief` (today it deletes only rentals/turns/knowledge/oauth/members/customRequests). **Why:** OIDC/Telegram consumers have no path to their own data and erasure leaves durable personal memory behind — trust copy advertises "Retention & erasure" the consumer line cannot honor.

**P1-10 · Tenant-scope the daily brief, consumer transcripts, sessions, knowledge** — *M* — `migrations/002_consumer_brief.sql`, `consumer-brief-store.ts`, `consumer-turn.ts`, `traceability.ts`
Two merged findings. (a) `miai_consumer_brief` is keyed by `consumer_id` alone and summarizes connected email/calendar — add `tenant_id`, PK `(tenant_id, consumer_id)`, thread `MemoryOwner` like the other stores. (b) `recordChatTurn` writes full user+assistant messages to shared B2B `miai_turns` with `workspaceId=walletId`, and session bag + `getComposedKnowledge` are `walletId`-only — include the tenant in the key. **Why:** one account id sees a shared brief/transcript across brands (and in mock/sandbox all collapse to `demo-user` → one brief for everyone), breaking the cross-brand isolation the memory/lifegraph/reminder stores already uphold.

**P1-11 · Per-visitor identity in the public sandbox** — *M* — `consumer-identity.ts`, `constants.ts`, `consumer-turn.ts`
The internet-facing sandbox runs `SANDBOX_MODE=1` + `NODE_ENV=production` + mock auth, so every visitor resolves to `consumer_id='demo-user'` and shares one session buffer, wallet, connector tokens, and per-brand memory. Mint a server-signed HttpOnly per-browser anonymous consumer id (non-forgeable → no impersonation) per visitor. **Why:** concurrent evaluators/prospects on the demo see each other's messages and stored facts — a live privacy leak on the exact surface used to win deals.

**P1-12 · Close the test & CI gaps around the failure and money paths** — *M–L* — `chat/route.ts`, `consumer/chat/route.ts`, `api-contract.test.mjs`, `wallet-metering.test.mjs`, `execute-error-handling.test.mjs`, `eval-suite.mjs`, `package.json`, `.github/workflows/ci.yml`, `sonar-project.properties`
Bundle that locks the fixes above. (a) **In-process route-handler tests** for `/api/chat` + `/api/consumer/chat` (auth→zod→runTurn→error mapping; happy + 400/401/403/429 + thrown-dependency 5xx) wired into `pnpm test` — today only non-blocking staging e2e exercises them, so a PR that 500s these routes passes all required checks. (b) **Failure-injection tests:** fake wallet/store throwing on getBalance/debit/get/set (verifies P0-4), model-down soft-error path, connector-down mid-turn through the full `runTurn` tool loop. (c) **Raise the mock-eval floor** from 35% to near baseline (≥90%) or a negative-delta-vs-committed-baseline gate. (d) **Coverage:** emit lcov via `--experimental-test-coverage`, feed Sonar, add a floor. (e) Direct unit tests for the 7 uncovered workflows (executive-assistant first — it backs the consumer flagship).

**P1-13 · Pre-turn affordability gate (charge-after-generation free tail)** — *M* — `runtime/src/index.ts`, `packages/wallet-adapter/src/index.ts`
The turn generates the model answer (real gateway cost) *before* `wallet.debit`; the only pre-turn check is `bal.tokens<=0`, and an overdrawing debit is rejected with no partial deduction, so a balance below one turn's cost freezes above zero and never reaches the gate. Add a pre-turn affordability estimate (skip the model call when the estimate exceeds remaining balance) and/or give the wallet overdraw semantics so the balance actually crosses zero. **Why:** permanent free-generation tail on the main path (main-path sibling of P0-2; less severe because it is at least flagged `paused` after the fact).

---

## P2 — Nice to have

**P2-1 · Reject non-v2 token envelopes in prod** — *S* — `oauth/tokens.ts` — `open()` returns plaintext as-is when it lacks a `v2./v1.` prefix; after the migration window, throw in prod (fail closed), keep plaintext/v1 behind a dev/migration flag.

**P2-2 · Separate secrets + rotation envelope** — *M* — `security-flags.ts`, `oauth/flow.ts`, `oauth/tokens.ts` — `OAUTH_STATE_SECRET`/`EMBED_KEY_SECRET` both default to `OAUTH_TOKEN_SECRET`; one compromise breaks encryption + state integrity + embed keys and rotation is impossible (`aesKey=sha256(secret)`). Require distinct secrets in prod; add a key-id/version to the v2 envelope for staged rotation.

**P2-3 · IPv6 SSRF gaps** — *S* — `connectors/src/ssrf.ts` — add explicit blocks for `64:ff9b::/96` (NAT64, can embed 169.254.169.254) and `2002::/16` (6to4), and decode IPv4-embedded IPv6 to v4 before the private-range check. Defense-in-depth (IPv4 metadata already blocked).

**P2-4 · Preserve honest `live:false` in the `executeLive` result wrapper** — *S* — `connectors/src/live/execute.ts` — the final `{...data, live:true}` spread flips `youtubeSearch`'s deliberate `{available:false, live:false}` back to live and mislabels the default-case stub as live. Only default `live` to true when the handler didn't set it; make the default case return `ok:false`. (Reinforces P0-5.)

**P2-5 · Localize static live-path fallbacks** — *M* — `runtime/src/index.ts`, `workflows/i18n.ts`, `guardrails.ts` — connector-unreachable, stubbed-connector, order/booking/application confirmations, and guardrail refusals are hardcoded English regardless of `req.replyLanguage`. Add i18n keys and route through `wf()`.

**P2-6 · PAN regex precision** — *S* — `runtime/src/guardrails.ts` — the `{13,19}` digit run over-fires on long order/reference/tracking numbers and misses dot-separated PANs. Normalize separators + add a Luhn check.

**P2-7 · Postgres pool timeouts** — *S* — `pg.ts` — set `connectionTimeoutMillis` (fast-fail on acquisition), `idleTimeoutMillis` (recycle before managed PG kills idle), `statement_timeout` (bound worst-case query). Do alongside P0-10 (same file).

**P2-8 · Backoff jitter** — *S* — `connectors/src/retry.ts`, `runtime/src/index.ts` — add full/decorrelated jitter to `withRetry` and `providerBackoffMs` to avoid synchronized retry storms against shared upstreams.

**P2-9 · Estimate basis fix** — *M* — `wallet-adapter`, `runtime/src/index.ts` — `estimateTurnTokens` keys off the full system string (incl. ~40k KB chars), over-charging no-model turns (guardrail-forced replies, pure deterministic workflows) and under-counting usage-less tool rounds. Base on the actual prompt sent; skip/lower when no model call; log estimate-vs-usage divergence.

**P2-10 · Retention/TTL + purge on consumer PII** — *M* — `consumer-memory-store.ts`, `traceability.ts`, `trust-content.ts` — add a configurable retention window + scheduled purge (reuse the brief/run-due cron) for consumer memory/goal/person/reminder/brief and consumer `miai_turns` rows; cap auto-extracted passive facts.

**P2-11 · Namespace consumer ids out of the B2B store/audit** — *M* — `oauth/callback/route.ts`, `consumer.ts`, `migrations/004` — consumer OAuth connect writes connector metadata + rental/audit rows into the B2B namespace keyed by the raw Google `sub`; prefix consumer ids (`usr_`) or branch the shared callback.

---

## Recommended execution sequence

Ordered by **active-harm × fix-size**, then by dependency, then batched by file/area. One-line rationale for the whole thing: *stop the money-loss and the crashes first (tiny diffs, live harm), then make the runtime fail safely around partner infra (the mandate), then stop the agent lying to customers and passing unsafe content, then stop shipping broken deploys, then close the privacy gaps, then lock it all with tests, then polish.*

- **Wave 0 — same-day, S-effort, independent, stops live harm:** P0-1 (double-charge key), P0-2 (workflow free-turn leak), P0-10 (process-crash pool handler). A few lines each; each removes a distinct production-grade harm with no dependencies. P1-5 (webhook default) can piggyback if touching that area.
- **Wave 1 — money correctness + partner-infra resilience (the mandate):** P0-3 (#106 metering), P0-4 (guard wallet calls) + its failure-injection test, P0-11 (timeouts + dependency telemetry). P0-4 and P0-11 harden the same await-partner surface — do together. **Kick off P0-8 (language classifier, L) in parallel now** — it's the long pole.
- **Wave 2 — customer-facing honesty + safety net:** P0-5 (stub honesty) **with** P0-6 (preflight) — same connector area, layered defenses; P0-7 (guardrail every turn incl. workflow); P0-9 (streaming scrub); land P0-8 as it completes. These are the reputational blockers.
- **Wave 3 — deploy & availability (P1):** P1-1 (readiness/migrations gate) **first** — it prevents broken deploys of everything after it — then P1-2 (graceful shutdown), P1-3 (rate-limit Redis), P1-4 (connector idempotency, which unblocks safe connector retries from P0-11).
- **Wave 4 — privacy & tenancy (P1), batched by the consumer store layer:** P1-9/10/11 (DSAR, tenant-scoping, sandbox identity) + P1-6 (token blast radius) + P1-7 (prompt injection) + P1-8 (probers).
- **Wave 5 — lock it against regression (P1):** P1-12 (route-handler + failure-injection + coverage + eval floor) and P1-13 (pre-turn affordability). Raising the CI floor here stops future PRs reopening the P0/P1 fixes.
- **Wave 6 — P2 polish, opportunistically co-located:** P2-7 with the P0-10 pool edit; P2-5/P2-6 with the guardrail edits; P2-1/P2-2 with the token edits; then P2-3, P2-8, P2-9, P2-10, P2-11.
Shell cwd was reset to /Users/malcolmgovender/Projects/Automation-tool