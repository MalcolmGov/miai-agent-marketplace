# Data Processing Agreement (DPA) — Template Outline — Draft

> **DRAFT — not legal advice.** Pending counsel / partner review. Not a signed agreement or certification.

**This document is a structural outline only.** It is **not for signature**. Final DPA text must be drafted and approved by qualified legal counsel for each customer engagement.

---

## 1. Parties and roles

| Party | Role (typical) |
|---|---|
| **[Customer legal name]** | **Controller** (or Joint Controller — **TBD counsel**) |
| **MyInstantAI / [Operating entity TBD]** | **Processor** |
| **Effective date** | **[TBD]** |
| **Term** | Co-terminous with master services agreement — **[TBD]** |

---

## 2. Subject matter and duration

- Processing of personal data submitted to the **MyInstantAI Agent Marketplace** for provision of AI agent services, connectors, audit, and support.
- Duration: for the term of the subscription plus deletion period in § 9.

---

## 3. Nature and purpose of processing

As described in **`docs/compliance/ROPA_DRAFT.md`**, including:

- Conversational AI inference and tool execution
- OAuth-sealed connector tokens
- Knowledge source storage
- Audit and traceability
- DSAR export assistance

---

## 4. Categories of data subjects and personal data

See RoPA table — chat transcripts, identifiers, tenant admin data, leads (if applicable). **Schedule A — TBD.**

---

## 5. Processor obligations (outline)

1. Process only on documented instructions from Controller.
2. Ensure personnel confidentiality.
3. Implement appropriate technical and organisational measures (see `docs/TRUST_AND_COMPLIANCE.md`, Phase 0–3 references).
4. Assist with data subject rights (DSAR export API; erasure via agreed process).
5. Assist with DPIA and breach notification (see `docs/compliance/BREACH_72H_RUNBOOK.md`).
6. Delete or return data on termination (§ 9).
7. Make available information necessary to demonstrate compliance; allow audits **subject to reasonable limits — TBD**.

---

## 6. Sub-processors

- Controller provides general authorisation for subprocessors listed in **`docs/TRUST_AND_COMPLIANCE.md`** § Subprocessors.
- Processor notifies Controller of changes; objection window **TBD — counsel**.
- **Schedule B — Sub-processor list** (name, service, region, processing activity) — maintain with each update.

---

## 7. International transfers

- Transfers outside EEA/UK **TBD** per deployment.
- **Standard Contractual Clauses (SCCs):** Module **TBD** (Module Two Controller-to-Processor typical) — incorporate by reference when counsel approves.
- Supplementary measures: encryption in transit/at rest, access controls — pointer to platform security docs.

---

## 8. Security measures

Summary pointer — not exhaustive:

- OIDC authentication, workspace RBAC
- AES-256-GCM OAuth token sealing
- CSP and security headers
- SSRF guards, boot hardening, dual-flag mock rails
- Postgres persistence and audit isolation

Full detail: **`docs/TRUST_AND_COMPLIANCE.md`**, **`docs/TECHNICAL_SPEC.md`** § 11.

---

## 9. Deletion on termination

Upon termination or expiry:

1. Controller may export via `GET /api/dsar/export` during notice period — **TBD SLA**.
2. Processor deletes tenant data from Postgres tables (`miai_rentals`, `miai_audit`, `miai_turns`, `miai_oauth_tokens`, `miai_knowledge_sources`, etc.) and file fallbacks within **TBD days**.
3. Backup retention and sub-processor deletion certificates — **TBD counsel**.
4. Anonymised aggregates may be retained if permitted — **TBD**.

---

## 10. Liability and governing law

**[TBD — counsel]** — cross-reference master agreement; limitation of liability; governing law and jurisdiction.

---

## Schedules (placeholders)

| Schedule | Content |
|---|---|
| **A** | Description of processing / data categories |
| **B** | Sub-processor list (link live doc) |
| **C** | SCCs (when adopted) |
| **D** | Technical and organisational measures (TOMs) summary |

---

## Document control

| Field | Value |
|---|---|
| Template version | 0.1 draft |
| Not for execution | **Do not sign this file** |
