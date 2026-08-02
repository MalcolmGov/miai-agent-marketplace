# Data Protection Impact Assessment (DPIA) — Marketplace Chat Agents — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**Assessment scope:** AI agent chat runtime across Agent Studio, Website embed, App channel, Ask AI, and WhatsApp — including LLM inference, connector tool execution, audit/traceability, and knowledge retrieval.

---

## 1. Description of processing

| Field | Detail |
|---|---|
| **Processing activity** | Multi-channel conversational AI agents rented from marketplace catalogue |
| **Data categories** | Chat messages, session metadata, optional PII in user input, connector-derived data, audit/transcript records |
| **Data subjects** | Customer end users; tenant employees configuring agents |
| **Automated decision-making** | Agent responses are generated; no solely automated legal/significant decisions claimed |
| **Necessity** | Core product function — agents cannot operate without processing conversational input to produce outputs |

---

## 2. Necessity and proportionality

| Question | Assessment (draft) |
|---|---|
| Is processing necessary for stated purpose? | Yes — inference and tool calls require message content |
| Can scope be minimised? | PII redaction on export; guardrails limit sensitive disclosures; OAuth tokens excluded from DSAR |
| Retention proportionate? | Audit cap and retention policy under review — see `docs/AUDIT_RETENTION.md` |

---

## 3. Risk identification

| Risk | Description | Inherent severity | Current controls |
|---|---|---|---|
| **R1 — LLM disclosure** | Model may reproduce training data, tenant knowledge, or prior context inappropriately | Medium–High | Runtime guardrails; market-pack compliance prompts; Test the guardrails probes; human DSAR path |
| **R2 — Cross-tenant leakage** | One workspace reads another's data | High | Workspace-scoped APIs; OIDC `workspace_id` from token; audit/DSAR scoped |
| **R3 — SSRF via connectors/webhooks** | Malicious URL in connector config reaches internal networks | Medium | SSRF guards in live connector execution; webhook redirect blocking |
| **R4 — Staging mock rails** | Production accidentally runs mock auth/wallet/model | High | Dual-flag mock rails (`ALLOW_MOCK_RAILS` + `I_UNDERSTAND_MOCK_RAILS_IN_PROD`); boot fail-closed |
| **R5 — OAuth token exposure** | Connector tokens leaked via logs or export | High | AES-256-GCM sealed storage; excluded from DSAR export |
| **R6 — Prompt injection / jailbreak** | User manipulates agent to bypass policy | Medium | Injection defences; guardrail engine; not 100% effective — residual risk |
| **R7 — Sub-processor / transfer** | LLM or cloud region outside adequacy | Medium | Document in RoPA; SCCs **TBD** per DPA |

---

## 4. Mitigations (implemented or planned)

| Mitigation | Status | Reference |
|---|---|---|
| Runtime guardrails (policy checks on input/output) | Shipped | `apps/web/src/lib/guardrails.ts`, Agent Studio probes |
| PII redact on export / telemetry paths | Shipped | `apps/web/src/lib/pii-redact.ts` |
| Dual-flag mock rails in production | Shipped | `apps/web/src/lib/security-flags.ts`, `docs/RAILWAY_DEPLOY.md` |
| SSRF protection on live connectors | Shipped | `packages/connectors/src/live/execute.ts` |
| Zod validation on API bodies | Shipped | Phase 3 `/api/v1/*` and legacy routes |
| Stripe Payment Links only (no PAN in chat) | Shipped | Connector description; PCI scope doc |
| Formal DPIA sign-off | **Not done** | This document |

---

## 5. Residual risks

After mitigations, the following **residual risks** remain (honest posture):

1. **LLM non-determinism** — guardrails reduce but do not eliminate harmful or non-compliant outputs.
2. **Knowledge base poisoning** — tenant-uploaded content can influence responses; no automated content moderation attestation.
3. **Human DSAR latency** — erasure is not fully automated in chat history today.
4. **Staging vs production parity** — Railway staging may differ from Azure production controls until cutover.

---

## 6. Consultation

| Stakeholder | Consulted? | Notes |
|---|---|---|
| DPO / privacy lead | **TBD** | |
| Security engineering | **TBD** | |
| Affected data subjects | N/A at draft stage | Customer-facing DPIA may be required per tenant |

---

## 7. Decision and sign-off

| Field | Value |
|---|---|
| **DPIA owner** | **TBD** |
| **Security owner** | **TBD** |
| **Outcome** | **TBD — proceed / proceed with conditions / do not proceed** |
| **Review date** | **TBD** |
| **Related documents** | `docs/compliance/ROPA_DRAFT.md`, `docs/TRUST_AND_COMPLIANCE.md`, `docs/compliance/BREACH_72H_RUNBOOK.md`
