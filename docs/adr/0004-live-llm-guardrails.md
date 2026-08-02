# ADR 0004: Live LLM shared guardrails + retrieval

**Status:** Accepted  
**Date:** 2026-08-02

## Context

Phase 3 enabled **live model providers** (OpenAI, Anthropic, gateway) alongside the mock model. Mock responses could embed refusal behaviour implicitly; live models need **deterministic pre/post policy** that does not depend on prompt luck.

Agents also answer from **tenant knowledge** chunked and retrieved at runtime — guardrails must apply on the same path for mock and live.

## Decision

1. **Shared guardrail engine** in `@miai/runtime` (`packages/runtime/src/guardrails.ts`):
   - **Input checks** before the model call (injection patterns, PAN/CVV, OTP, STOP/TCPA, cross-tenant probes, emergency handoffs).
   - **Output checks** after the model response where applicable.
   - Hard refusals and handoff tool calls **do not rely on MockModel** alone.
2. **Market-pack prompts** in each `.agent.json` carry regional compliance cues (CCPA/TCPA, GDPR, POPIA-style, PDPA-style, Oceania emergency numbers). Guardrails enforce platform-wide floors; packs add vertical context.
3. **Retrieval:** Agent knowledge is chunked by `##` headings, indexed for search, and cited in answers. Chat path uses retrieval results plus tool outputs; guardrails run regardless of grounding source.
4. **Studio verification:** Agent Studio exposes **“Test the guardrails”** probes (`apps/web/src/lib/guardrails.ts`) for injection, erasure, and cross-tenant scenarios — demo and eval aid, not a certification.
5. **Eval coverage:** Static eval suite exercises refusal and policy behaviour; live LLM smoke scripts (`pnpm smoke:live-llm`) optional when keys are present.

## Consequences

**Positive**

- Consistent safety behaviour across mock and live models.
- Partners can demo guardrails without reading source.
- Retrieval + guardrails compose: policy applies to retrieved content and model paraphrase.

**Negative / follow-ups**

- Guardrails reduce but **do not eliminate** jailbreak and hallucination risk — Trust copy must under-claim.
- Not every edge case in 500 packs is individually attested; platform rules are shared, pack nuance varies.
- Live provider latency and cost are outside this ADR.

## References

- [docs/TRUST_AND_COMPLIANCE.md](../TRUST_AND_COMPLIANCE.md)
- [docs/adr/0001-catalog-100x5.md](0001-catalog-100x5.md)
- `packages/runtime/src/guardrails.ts`, `packages/runtime/src/index.ts`
