# Record of Processing Activities (RoPA) — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**Controller / processor roles (TBD — counsel to confirm per customer contract):**

| Role | Entity | Notes |
|---|---|---|
| **Controller** | Customer (workspace owner) | Determines purposes for agent chat, knowledge, connector use |
| **Processor** | MyInstantAI / Moove Digital (platform operator) | Processes data on customer instructions via marketplace runtime |
| **Sub-processors** | See [Subprocessors](../TRUST_AND_COMPLIANCE.md#subprocessors-staging--production) in `docs/TRUST_AND_COMPLIANCE.md` |

---

## Processing activities

| Activity | Categories of data subjects | Categories of personal data | Purpose | Lawful basis (placeholder) | Retention (placeholder) |
|---|---|---|---|---|---|
| **Marketplace chat (Studio / Website / App / Ask AI / embed)** | End users, employees, customers of tenant | Chat transcripts; session metadata; correlation IDs; optional user identifiers | Provide AI agent responses; audit and support | Contract / legitimate interests — **TBD counsel** | **TBD** — see `docs/AUDIT_RETENTION.md` |
| **OAuth connector tokens** | Tenant admins | OAuth access/refresh tokens (AES-256-GCM sealed at rest; not exported via DSAR) | Enable third-party integrations (Slack, Google, etc.) | Contract | Until disconnect / workspace deletion — **TBD** |
| **Knowledge sources** | Tenant-provided | Uploaded docs, URLs, structured knowledge payloads | RAG / agent context | Contract | Until source removed — **TBD** |
| **Audit & traceability** | Tenants, end users (indirect) | Audit events; turn transcripts linked by `correlation_id` | Security, metering, compliance trail | Legitimate interests / legal obligation — **TBD** | Cap ~20k rows Postgres / file fallback — **TBD policy** |
| **Leads (Ask AI / custom requests)** | Prospects | Name, email, message content in `miai_ask_leads` / `miai_custom_requests` | Sales follow-up | Consent / legitimate interests — **TBD** | **TBD** |
| **Workspace & RBAC** | Tenant users | User IDs, roles, workspace membership | Access control | Contract | Duration of subscription — **TBD** |

---

## Recipients / subprocessors

Sub-processor schedule and regions: **`docs/TRUST_AND_COMPLIANCE.md`** § Subprocessors.

| Sub-processor | Processing | Region |
|---|---|---|
| Microsoft Azure | Container Apps, Postgres, Key Vault, App Insights (production path) | Deploy-time region |
| Railway | Staging host | US (staging) |
| LLM provider (via MIAI gateway) | Inference on chat prompts | Per gateway policy |
| OAuth vendors | Connector authentication | Vendor regions |
| Stripe | Payment Links / Checkout (no PAN in platform) | Stripe regions |

---

## International transfers

**TBD.** Cross-border transfers (e.g. EU → US staging on Railway, LLM inference regions) require transfer mechanism assessment (SCCs, adequacy, supplementary measures). Document per deployment and customer DPA.

---

## Security measures (pointer)

Technical and organisational measures are described in shipped controls — not a certification:

| Phase | Reference |
|---|---|
| **Phase 0** | Boot hardening, `security-flags`, SSRF guards, HMAC embed/OAuth state, enforcing CSP — `apps/web/src/lib/security-flags.ts`, `apps/web/next.config.ts`, `packages/connectors/src/live/execute.ts` |
| **Phase 1** | OIDC Bearer, workspace RBAC, audit isolation — `docs/TRUST_AND_COMPLIANCE.md` |
| **Phase 2** | Postgres persistence, migrations — `apps/web/migrations/001_init.sql` |
| **Phase 3** | Runtime guardrails, PII redact, zod validation — `apps/web/src/lib/guardrails.ts`, `apps/web/src/lib/pii-redact.ts` |

---

## Data subject rights

| Right | Current posture |
|---|---|
| Access / portability | `GET /api/dsar/export` — owner/admin JSON pack (no OAuth secrets) |
| Erasure | Human handoff; automated chat erasure not claimed — see Trust Center |
| Restriction / objection | **TBD** — process with counsel |

---

## Document control

| Field | Value |
|---|---|
| Version | 0.1 (draft skeleton) |
| Owner | **TBD — DPO / privacy lead** |
| Next review | **TBD** |
| Related | `docs/TRUST_AND_COMPLIANCE.md`, `docs/compliance/DPIA_DRAFT.md`, `docs/AUDIT_RETENTION.md`
