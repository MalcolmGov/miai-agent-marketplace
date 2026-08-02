# PCI DSS Scope Reduction — Stripe / SAQ-A Style Narrative — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**This is not a completed SAQ, AoC, or QSA attestation.** Formal SAQ completion depends on Stripe account configuration, acquirer relationship, and Qualified Security Assessor (QSA) or Self-Assessment Questionnaire eligibility review.

---

## Scope reduction thesis

The MyInstantAI Agent Marketplace is designed so that **cardholder data (PAN, CVV, PIN, OTP) never touches the platform application, chat runtime, or agent prompts**.

| Control | Implementation |
|---|---|
| **No PAN storage** | Platform does not persist primary account numbers |
| **No PAN in chat** | Stripe connector creates **Payment Links** / Checkout sessions only — `packages/connectors/src/live/execute.ts` |
| **Wallet / billing** | Token wallet via MyInstantAI adapter; card capture delegated to Stripe hosted flows |
| **Runtime guardrails** | Market packs and guardrail engine discourage PAN/CVV collection in conversational flows |
| **PII redact** | `apps/web/src/lib/pii-redact.ts` on export/telemetry paths |

**Connector description (product intent):** Stripe — *"Payment links — never raw card in chat."*

---

## Target SAQ profile (draft — confirm with QSA / Stripe)

For merchants where **all** card-not-present payment acceptance is fully outsourced to Stripe (Payment Links, Checkout, Elements in Stripe-hosted or SAQ-A eligible integration):

| SAQ type | Typical eligibility (indicative) |
|---|---|
| **SAQ A** | E-commerce; card data entered only on Stripe-hosted pages; merchant website does not receive PAN |

**Dependencies for formal SAQ-A:**

- Stripe Dashboard account correctly configured
- No custom code that handles PAN on marketplace servers
- Stripe attestation / responsibility matrix reviewed annually
- **QSA or ISA validation** if required by acquirer

---

## Platform components in / out of scope (draft)

| Component | PCI relevance |
|---|---|
| Chat API / embed | **Out of scope** for PAN if guardrails hold and no card fields |
| Stripe Payment Link creation | **Stripe scope** — API keys stored sealed; no PAN transits |
| Postgres / audit logs | Must not contain PAN — monitor via guardrails + log review |
| Railway staging / Azure production | Infrastructure scope follows deployment architecture — **TBD with QSA** |

---

## Ongoing controls (evidence pointers)

1. **Guardrails** — `apps/web/src/lib/guardrails.ts`; Agent Studio "Test the guardrails" probes
2. **PII redact** — `apps/web/src/lib/pii-redact.ts`
3. **Stripe integration** — Payment Links only in live connector; no raw card API
4. **Secrets** — `OAUTH_TOKEN_SECRET`, Stripe API keys via env / Key Vault; not in repo (CI secrets job)
5. **CI** — `.github/workflows/ci.yml` blocks committed `.env` / key material

---

## Gaps / not claimed

- No completed **SAQ A** (or other SAQ) on file
- No **AoC** (Attestation of Compliance)
- No ASV scan programme documented here
- Card-guardrail coverage is not attested at 100% across all 500 agent packs
- Enterprise customers must validate their own merchant PCI obligations

---

## Next steps (for formal compliance)

1. Engage QSA or use Stripe PCI guidance for SAQ-A eligibility confirmation.
2. Document network segmentation and responsibility split (Stripe vs Azure vs Railway).
3. Annual SAQ submission per acquirer requirements.
4. Add evidence artifacts to `docs/compliance/SOC2_EVIDENCE_INDEX.md` when available.

---

## Related documents

- `docs/TRUST_AND_COMPLIANCE.md`
- `docs/compliance/DPIA_DRAFT.md` (payment-related risks)
- `docs/TECHNICAL_SPEC.md` — connectors, persistence
