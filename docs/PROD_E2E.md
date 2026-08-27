# Production-config E2E run

Validate the platform in **full production configuration** on a real environment **before** the
Azure cutover. The application is the same container everywhere — only configuration and backing
services change — so running it with production rails on the current (Railway) infrastructure
proves the production code paths cheaply, and closes the "never run in production configuration"
readiness gap.

This run proves the **software** (OIDC login, http-wallet debit, real model, live connectors,
fail-closed boot). It does **not** prove Azure-specific infrastructure, MyInstantAI's actual
endpoints/keys, or data residency — those are validated in the Azure dress rehearsal
(`MyInstantAI-Azure-Deployment-Cutover`).

## Prerequisites (you provide)

- A **dedicated environment**, separate from the live demo/sandbox (a Railway service is fine).
- Real **OIDC** issuer (any provider — the platform is provider-agnostic via discovery).
- A real **wallet** endpoint (MyInstantAI's gateway, or a contract-compatible stand-in).
- A **spend-capped** model key (Azure OpenAI / gateway / OpenAI).
- Managed **Postgres** + **Upstash Redis**.
- Strong, **distinct** secrets.

> Claude never sets secrets or deploys — those steps are yours. This runbook and the harness make
> the run push-button once the environment is up.

## Step 1 — stand up the production-config environment

Copy `apps/web/.env.prod-e2e.example`, fill in the real values, and set them on the environment.
Every rail must be real (`MIAI_AUTH_MODE=oidc`, `MIAI_WALLET_MODE=http`, `MIAI_MODEL_MODE=azure|gateway|openai`,
`DATABASE_URL`, `UPSTASH_REDIS_REST_*`, `SANDBOX_MODE` unset). Deploy the current container.

## Step 2 — clear the boot gate (go / no-go)

The `/api/health` endpoint is the gate. Run either:

```bash
node scripts/prod-e2e-gate.mjs https://<your-prod-config-url>
```

or the Playwright version:

```bash
PLAYWRIGHT_BASE_URL=https://<your-prod-config-url> pnpm test:e2e:prod
```

Both assert: `sandboxMode:false`, `mockRailsAllowed:false`, `hardening:ok`, `authMode:oidc`,
`walletMode:http`, a real `modelMode`, `oidcIssuer/walletUrl/modelUrl:set`, `storeBackend:postgres`,
`storePing:ok`, `redisConfigured:true`, `redisPing:ok`, `nodeEnv:production`. **All must pass
before Step 3.** A failure prints the specific gate and any boot-hardening errors — fix config,
redeploy, re-run.

## Step 3 — run the end-to-end journeys

The boot gate is fully automated. The **authenticated** journeys need a real OIDC session (the
staging `@smoke`/`@handover` suites use mock-auth headers and won't apply under real OIDC), so run
these against the environment with a real login (or a session token injected into the request
context):

1. **OIDC sign-in** end to end → authenticated session.
2. **Live agent turn** on the real model → response with metered token usage.
3. **Wallet money path**: balance → debit → an insufficient balance **pauses** the agent (no free serving).
4. **Live connector action**: connected → real success; unconnected → honest "not connected", **no fabricated confirmation**.
5. **Guardrails** on the live path: card / OTP / self-harm inputs → correct refusals and emergency handoff.
6. **Streaming**: a leaked card/OTP is withheld token-by-token; the final reply is redacted.
7. **Rate limiting**: burst a public endpoint → `429` (multi-replica, via Redis).
8. **Idempotency**: replay a turn/debit → **no double-charge**.
9. **Failure injection**: wallet-down / model-down / connector-down mid-turn → graceful degradation, no `5xx` on the money path.
10. **Multi-tenant isolation**: two workspaces cannot see each other's data.

## Pass criteria

All boot gates green; every journey passes; no `5xx` on the auth or money paths; metering matches
usage; no fabricated confirmations; guardrails fire; rate limits enforce; idempotency holds.

## Safety / teardown

Separate environment from the live demo; spend-capped model key; throwaway tenants and wallet; no
real customer data; tear the environment down afterwards.
