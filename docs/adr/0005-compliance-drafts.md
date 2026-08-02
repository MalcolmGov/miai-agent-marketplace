# ADR 0005: Phase 4 draft compliance docs (not certifications)

**Status:** Accepted  
**Date:** 2026-08-02

## Context

Partners and enterprise pilots ask for privacy pages, DPAs, breach runbooks, and SOC 2 narratives before the platform holds formal certifications. Phase 4 needed **honest, shippable artefacts** in-repo without implying legal sign-off or audited compliance.

## Decision

1. **Draft legal surfaces in the app:** `/privacy`, `/terms`, `/cookies` plus consent banner (`POST /api/consent`) — content from `legal-content.ts`; **counsel review pending**.
2. **Draft compliance pack under `docs/compliance/`:** ROPA, DPIA, breach 72h runbook, PCI/Stripe SAQ notes, SOC 2 evidence index, DPA/BAA **templates** — all marked draft / TBD where counsel or auditor input is required.
3. **Single trust narrative:** [docs/TRUST_AND_COMPLIANCE.md](../TRUST_AND_COMPLIANCE.md) mirrors the in-app Trust Center with **Live / Partial / Planned** tags; prefer under-claiming in sales.
4. **Explicit non-claims:** These documents are **not** SOC 2 reports, GDPR certifications, BAAs, or signed DPAs. Production behaviour (guardrails, DSAR export/erase, dual-flag mock rails) is described as **shipped controls**, not certifications.
5. **Security contact:** `security@myinstantai.com` for questionnaires and vuln reports ([SECURITY.md](../../SECURITY.md)).

## Consequences

**Positive**

- Sales and engineering share one vocabulary for what is shipped vs planned.
- Auditors can map controls to code paths via SOC2 evidence index.
- OSS contributors see scope boundaries (marketplace runtime vs tenant LLM content).

**Negative / follow-ups**

- Draft copy must be refreshed after counsel review — avoid copying into contracts verbatim until then.
- Some checklist items remain TBD (retention caps, DPA SLAs); track in compliance folder issues.
- Certifications (SOC 2 Type II, etc.) remain roadmap items, not implied by file presence.

## References

- [docs/TRUST_AND_COMPLIANCE.md](../TRUST_AND_COMPLIANCE.md)
- [docs/compliance/](../compliance/)
- [SECURITY.md](../../SECURITY.md)
