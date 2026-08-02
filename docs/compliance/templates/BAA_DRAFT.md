# Business Associate Agreement (BAA) — Template Outline — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**HIPAA status: BLOCKED.** The platform is **not PHI-ready** today. Do **not** market the marketplace as HIPAA-compliant or suitable for Protected Health Information (PHI) workloads until:

1. PHI-capable architecture is designed and implemented (encryption, access logging, minimum necessary, BAA chain with all subprocessors handling PHI).
2. This template is replaced with counsel-approved BAA text.
3. A covered entity or business associate **countersigns** a executed BAA.

This outline exists so enterprise prospects can see a **readiness path** — it is **not** an offer or agreement.

---

## Explicit marketing restriction

**Do not claim:** HIPAA compliant · PHI-ready · BAA available · suitable for clinical decision support with patient records.

**Say instead:** HIPAA workloads require a executed BAA and PHI architecture not yet shipped; health-family agents include caution prompts only.

---

## 1. Parties (placeholder)

| Party | HIPAA role |
|---|---|
| **[Covered Entity / Business Associate name]** | Covered Entity or upstream BA |
| **[MyInstantAI operating entity TBD]** | Business Associate (when enabled) |

---

## 2. Definitions

Standard HIPAA definitions: PHI, Electronic PHI (ePHI), Breach, Security Incident, Required by Law, etc. — **full legal text TBD counsel**.

---

## 3. Permitted uses and disclosures

- BA may use/disclose PHI only to perform services under the underlying agreement and as permitted by 45 CFR §164.502(a)(3) — **scope TBD when PHI architecture exists**.

---

## 4. BA obligations (outline — not in effect)

When PHI architecture is complete, BA typically agrees to:

1. Not use or disclose PHI other than as permitted.
2. Use appropriate safeguards (45 CFR Part 164 Subpart C).
3. Report breaches per **`docs/compliance/BREACH_72H_RUNBOOK.md`** (adapt for HIPAA timelines).
4. Ensure subcontractors sign BAAs (**subprocessor BAA chain TBD**).
5. Make PHI available for individual rights (access, amendment, accounting).
6. Return or destroy PHI at termination.
7. Make internal practices available to HHS upon investigation.

**None of the above is operational today.**

---

## 5. Blockers before countersignature

| Blocker | Current state |
|---|---|
| PHI data model & isolation | Not implemented |
| ePHI encryption at rest (Key Vault, field-level) | Partial platform encryption; not PHI-validated |
| Audit immutability (WORM) | Soft retention only — see `docs/AUDIT_RETENTION.md` |
| Minimum necessary enforcement | Guardrails exist; not HIPAA attested |
| Subprocessor BAAs (Azure, LLM, etc.) | **TBD** |
| Risk analysis (HIPAA Security Rule) | **Not completed** |

---

## 6. Termination

Upon termination, return or destroy PHI per 45 CFR §164.504(e)(2)(J) — **procedure TBD**.

---

## Related documents

- `docs/TRUST_AND_COMPLIANCE.md` — US pack HIPAA caution
- `docs/compliance/DPIA_DRAFT.md`
- `docs/compliance/ROPA_DRAFT.md`

---

## Document control

| Field | Value |
|---|---|
| Template version | 0.1 draft |
| Status | **Blocked — not for signature** |
