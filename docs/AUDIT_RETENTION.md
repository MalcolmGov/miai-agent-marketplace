# Audit & Traceability Retention Posture — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**Scope:** Audit events (`miai_audit`), chat turn transcripts (`miai_turns`), and in-memory/file fallback stores used when Postgres is unavailable.

---

## Current implementation

| Backend | Retention behaviour | WORM? |
|---|---|---|
| **Postgres (preferred)** | Insert-only append via `insertAuditRow`; cap enforced by `DELETE` keeping newest **20,000** rows (`AUDIT_CAP` in `apps/web/src/lib/store.ts`) | **No** — rows can be deleted by cap logic or direct SQL |
| **File fallback (`rentals.json`)** | Audit array truncated to **20,000** entries on persist | **No** — file is rewriteable |
| **In-memory (dev / pre-hydrate)** | Same cap as file path | **No** |

Postgres schema: `apps/web/migrations/001_init.sql` — `miai_audit`, `miai_turns` with workspace-scoped indexes.

Turn transcripts are stored separately in `miai_turns` (see `apps/web/src/lib/traceability.ts`). **Retention policy for turns TBD** — not automatically capped identically to audit in all code paths; counsel to align with RoPA.

---

## Soft retention vs WORM

| Term | Meaning in this platform |
|---|---|
| **Soft retention control** | The `DELETE FROM miai_audit … LIMIT cap` pattern and in-memory/file slice — old rows are **hard-deleted**, not archived immutably |
| **WORM (Write Once Read Many)** | **Not implemented.** True WORM requires immutable blob storage (Azure Immutable Blob), append-only ledger, or Key Vault-backed audit with legal hold — **blocked pending architecture** |

Hard `DELETE` of aged rows is a **operational cap**, not a compliance-grade immutable audit log. For SOC 2 / regulatory scenarios requiring non-repudiation, treat current audit as **best-effort traceability**, not tamper-proof evidence.

---

## Recommended future architecture

1. **`miai_audit_archive` table** — periodic move of rows older than policy threshold; restrict `DELETE`/`UPDATE` via DB role.
2. **Immutable blob export** — nightly append blob to Azure Storage with immutability policy for auditor retention window.
3. **Key Vault / HSM-backed signing** — hash chain over audit batches (optional, higher assurance).
4. **Unified retention job** — single scheduler for `miai_audit` and `miai_turns` with documented periods per data category.
5. **Legal hold flag** — suspend deletion for workspaces under litigation/DSAR hold.

---

## Operational guidance

| Action | Guidance |
|---|---|
| Incident response | Preserve Postgres snapshot / export before cap deletion during breach investigation — see `docs/compliance/BREACH_72H_RUNBOOK.md` |
| DSAR export | `GET /api/dsar/export` includes conversation turns; does not include OAuth secrets |
| Tenant offboarding | Deletion on termination **TBD** in DPA — see `docs/compliance/templates/DPA_DRAFT.md` |
| Staging (Railway) | Same cap logic; shorter operational retention may be acceptable — **document per environment** |

---

## Related documents

- `docs/compliance/ROPA_DRAFT.md` — audit category retention placeholders
- `docs/compliance/SOC2_EVIDENCE_INDEX.md` — evidence pointers
- `docs/TRUST_AND_COMPLIANCE.md` — shipped audit controls
- `docs/TECHNICAL_SPEC.md` § 11 — persistence summary
