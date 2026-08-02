# Personal Data Breach — 72-Hour Response Runbook — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**Purpose:** Operational checklist when a suspected or confirmed personal data breach affects the MyInstantAI Agent Marketplace platform or tenant data. GDPR Art. 33 requires notification to supervisory authority within **72 hours** where feasible when risk to individuals is likely — **confirm requirements with counsel** for each jurisdiction.

---

## Roles (placeholders — assign before production)

| Role | Name / contact | Responsibilities |
|---|---|---|
| **Information Officer / DPO** | **TBD — Name, email, phone** | Legal assessment, regulator notification, data subject communication |
| **Security owner / incident commander** | **TBD — Name, email, phone** | Technical containment, evidence preservation, remediation |
| **Platform engineering on-call** | **TBD — rotation / pager** | Execute runbook steps, log actions |
| **Executive sponsor** | **TBD** | Customer/partner communication approval |
| **External counsel** | **TBD** | Breach notification obligations, timing, content |

**Escalation contact (draft):** `security@myinstantai.com`

---

## Phase 1 — Detect

| Signal source | What to check |
|---|---|
| **`GET /api/health`** | Unexpected `mock_rails` warnings, store backend errors, degraded Postgres ping |
| **Audit log** | `/api/audit` (workspace-scoped); Postgres `miai_audit`; App Insights `miai.audit.*` if enabled |
| **Infrastructure** | Railway staging logs/dashboard; Azure Container Apps / Postgres / Key Vault alerts (production) |
| **External** | Customer report, responsible disclosure, sub-processor notice (Azure, Stripe, LLM provider) |

**Immediate actions:**

1. Open incident ticket with severity **P1** if personal data may be involved.
2. Record **detection time (UTC)** — starts 72h clock for GDPR assessment.
3. Preserve logs — do not delete audit rows or rotate secrets until forensic snapshot taken.

---

## Phase 2 — Contain

| Step | Action |
|---|---|
| 1 | Revoke compromised credentials (OAuth secrets, embed keys, API tokens) via env rotation / Key Vault |
| 2 | Disable affected workspace or connector if tenant-specific |
| 3 | If platform-wide: consider toggling `MIAI_AUTH_MODE=oidc` enforcement, blocking embed endpoint, or scaling to zero on Railway/Azure |
| 4 | Block egress if SSRF or exfil suspected — review connector execution logs |
| 5 | Document all containment actions with timestamps in incident ticket |

---

## Phase 3 — Assess

Work with **Information Officer** and counsel:

| Question | Notes |
|---|---|
| What data categories were affected? | Chat transcripts, OAuth tokens, knowledge, audit, leads — see RoPA |
| How many data subjects / workspaces? | Query Postgres scoped tables; avoid cross-tenant exposure during investigation |
| Likely consequences for individuals? | Identity theft, reputational harm, discrimination — severity rating **TBD** |
| Root cause | Vulnerability class, misconfiguration, insider, sub-processor |
| Notification required? | Supervisory authority (72h); data subjects (without undue delay if high risk) — **counsel decides** |

**Evidence to collect:**

- Audit events and correlation IDs from affected window
- Deployment/config diff (Railway env, Azure bicep, recent commits)
- Access logs (OIDC IdP, Azure RBAC, Railway team access)

---

## Phase 4 — Notify (where required)

| Audience | Timing | Owner |
|---|---|---|
| **Supervisory authority** | Within **72 hours** of awareness if GDPR applies and risk likely — **TBD counsel** | Information Officer |
| **Affected data subjects** | Without undue delay if high risk to rights — **TBD counsel** | Information Officer + comms |
| **Customers (controllers)** | Contractual breach clause — **TBD DPA** | Executive sponsor |
| **Sub-processors / processors** | If we are controller for subset — **TBD** | Information Officer |

**Notification content (draft checklist):**

- Nature of breach
- Categories and approximate number of records/subjects
- Likely consequences
- Measures taken / proposed
- DPO contact point

---

## Phase 5 — Recover and post-mortem

| Step | Action |
|---|---|
| 1 | Remediate root cause; deploy fix via normal CI (`.github/workflows/ci.yml`) |
| 2 | Rotate secrets; verify `/api/health` clean |
| 3 | **Post-mortem within 5 business days** — blameless write-up |
| 4 | Update DPIA / RoPA / controls if gap identified |
| 5 | Track corrective actions in roadmap; link evidence in `docs/compliance/SOC2_EVIDENCE_INDEX.md` |

---

## Related documents

- `docs/compliance/ROPA_DRAFT.md` — data categories
- `docs/compliance/DPIA_DRAFT.md` — risk register
- `docs/AUDIT_RETENTION.md` — log retention limits
- `docs/TRUST_AND_COMPLIANCE.md` — subprocessors and shipped controls
- `docs/RAILWAY_DEPLOY.md` — staging infrastructure
