# SOC 2 Evidence Index — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**Purpose:** Index of in-repo and operational artifacts useful for a future SOC 2 Type II auditor engagement. **This index does not constitute SOC 2 certification.** The platform is **not SOC 2 certified** today.

---

## How to use this index

Each row links to evidence a practitioner can collect for Trust Services Criteria (security, availability, confidentiality, etc.). Paths are **repository-relative** — not URLs to secrets or production credentials.

---

## CC — Common Criteria / Security

| Evidence item | Location | Notes |
|---|---|---|
| CI pipeline (build, test, lint, audit) | `.github/workflows/ci.yml` | Typecheck, unit tests, static evals, critical dependency audit |
| Branch protection | GitHub repo settings (document screenshot for auditor) | Require PR + passing CI on `main` — **verify enabled** |
| Committed secrets gate | `.github/workflows/ci.yml` job `secrets` | Blocks `.env`, `.pem`, `id_rsa` in git |
| Boot hardening / fail-closed | `apps/web/src/instrumentation.ts`, `apps/web/src/lib/security-flags.ts` | Refuses weak secrets and mock rails in production |
| SSRF protection | `packages/connectors/src/live/execute.ts` | Webhook redirect blocking, URL validation |
| HMAC embed keys & OAuth state | `apps/web/src/lib/security.ts`, OAuth flow docs | Deterministic embed keys; PKCE + HMAC state |
| CSP & security headers | `apps/web/next.config.ts` | Enforcing Content-Security-Policy, nosniff, frame options |
| Security boot tests | `apps/web/test/security-boot.test.mjs` | Mock-rails dual-flag behaviour |

---

## Phase 2 — Persistence & change management

| Evidence item | Location | Notes |
|---|---|---|
| Postgres schema / migrations | `apps/web/migrations/001_init.sql` | `miai_rentals`, `miai_audit`, `miai_turns`, token/knowledge tables |
| Store backend selection | `apps/web/src/lib/store.ts` | Postgres preferred; file fallback documented |
| Railway deploy config | `docs/RAILWAY_DEPLOY.md`, `railway.toml`, `Dockerfile` | Staging health `/api/health` |
| Azure infra (production path) | `infra/azure/` | Bicep landing zone — Key Vault refs |

---

## Phase 3 — Input validation & runtime safety

| Evidence item | Location | Notes |
|---|---|---|
| API zod validation | `docs/TECHNICAL_SPEC.md` § API (Phase 3) | `/api/v1/*` + legacy routes |
| Runtime guardrails | `apps/web/src/lib/guardrails.ts` | Policy enforcement on chat path |
| PII redaction | `apps/web/src/lib/pii-redact.ts` | Export and telemetry redaction |
| OpenAPI stub | `GET /api/v1/openapi` | Versioned contract surface |
| Traceability / audit | `apps/web/src/lib/traceability.ts` | Correlation IDs, turn transcripts |

---

## Privacy & trust (not certification)

| Evidence item | Location | Notes |
|---|---|---|
| Trust Center (in-app) | `/trust` route in `apps/web` | Four-pillar UI; Live/Partial/Planned tags |
| Trust & compliance source doc | `docs/TRUST_AND_COMPLIANCE.md` | Single source of truth; under-claiming policy |
| RoPA draft | `docs/compliance/ROPA_DRAFT.md` | Processing activities skeleton |
| DPIA draft | `docs/compliance/DPIA_DRAFT.md` | Chat agent risk assessment skeleton |
| DPA template | `docs/compliance/templates/DPA_DRAFT.md` | Not for signature |
| Breach runbook | `docs/compliance/BREACH_72H_RUNBOOK.md` | 72h process draft |
| Audit retention posture | `docs/AUDIT_RETENTION.md` | Retention limits; WORM gap documented |

---

## Data subject access

| Evidence item | Location | Notes |
|---|---|---|
| DSAR export API | `apps/web/src/app/api/dsar/export/route.ts` | Owner/admin JSON pack; no OAuth secrets |
| Workspace RBAC | `docs/TRUST_AND_COMPLIANCE.md` § Shipped controls | Roles on DSAR, audit, mutating APIs |
| Audit API (scoped) | `/api/audit` | Workspace isolation |

---

## Availability & monitoring (partial)

| Evidence item | Location | Notes |
|---|---|---|
| Health endpoint | `GET /api/health` | Liveness, mode report, store ping |
| App Insights events | `miai.audit.*` custom events | Optional; Azure path |
| Nightly eval workflow | `.github/workflows/eval-nightly.yml` | Catalogue quality signal |

---

## Explicit exclusions (honest posture)

- **No SOC 2 Type I or II report**
- **No ISO 27001 certificate**
- **No penetration test report** in repo (engage vendor separately)
- **No formal change advisory board** — use GitHub PR process
- Mock auth/wallet/model allowed in staging with dual flags — document for auditor

---

## Document control

| Field | Value |
|---|---|
| Index version | 0.1 draft |
| Owner | **TBD — security / GRC lead** |
| Next review | Before auditor engagement |
