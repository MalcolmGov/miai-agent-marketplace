# ADR 0002: Dual-flag mock rails for staging demos

**Status:** Accepted  
**Date:** 2026-08-02

## Context

Phase 0 shipped with **mock auth, wallet, and model** rails so partners could click through rent → configure → chat without OIDC, a live wallet API, or LLM keys. Production cutover requires real rails, but **long-lived staging demos** (e.g. Railway) still need mock behaviour without weakening default production posture.

A single env flag is too easy to set accidentally in production.

## Decision

1. **Default:** In `NODE_ENV=production`, mock auth (`MIAI_AUTH_MODE=mock`), mock wallet (`MIAI_WALLET_MODE=mock`), and mock model (`MIAI_MODEL_MODE=mock`) **fail closed at boot** unless explicitly overridden.
2. **Staging escape hatch (dual flag):** Mock rails are allowed in production only when **both** are set:
   - `ALLOW_MOCK_RAILS=1`
   - `I_UNDERSTAND_MOCK_RAILS_IN_PROD=1`
3. **Half-configured flags are rejected** — setting only one of the pair blocks startup with a clear error.
4. When dual flags are active, boot emits a structured **`miai.mock_rails_enabled`** warning for operators and auditors.
5. The same dual-flag pattern applies to **`ALLOW_EMBED_ORIGIN_STAR`** + **`I_UNDERSTAND_EMBED_ORIGIN_STAR`** for permissive embed CORS in staging only.
6. Strong secrets (`OAUTH_TOKEN_SECRET`, etc.) are enforced whenever OIDC is on **or** production runs without the mock-rails escape hatch.

Implementation: `apps/web/src/lib/security-flags.ts`, invoked from `instrumentation.ts` on server start.

## Consequences

**Positive**

- Customer-facing production cannot silently run mock rails.
- Staging demos remain one env block away, documented in [RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md).
- SOC 2 / audit narratives can cite explicit acknowledgment flags.

**Negative / follow-ups**

- Operators must remember the two-flag ritual; mis-typed env vars block deploy.
- Mock rails in staging are **not** representative of latency, billing, or model behaviour — label demos accordingly.

## References

- [docs/RAILWAY_DEPLOY.md](../RAILWAY_DEPLOY.md)
- [docs/compliance/DPIA_DRAFT.md](../compliance/DPIA_DRAFT.md) (R4 — staging mock rails)
