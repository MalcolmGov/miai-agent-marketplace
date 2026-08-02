# Architecture Decision Records (ADRs)

Short, durable records of significant design choices in the Agent Marketplace. Each ADR is **one to two pages** — enough context for a new engineer or partner to understand *why*, not a full spec.

## Format

| Field | Content |
|---|---|
| **Title** | Short noun phrase |
| **Status** | `Accepted` · `Superseded` · `Deprecated` |
| **Date** | ISO date of acceptance |
| **Context** | Problem and constraints |
| **Decision** | What we chose |
| **Consequences** | Trade-offs, follow-ups |

New ADRs use the next sequential number: `NNNN-short-slug.md`.

## Index

| ADR | Title |
|---|---|
| [0001](0001-catalog-100x5.md) | Catalogue 100 × 5 markets (500 SKUs) |
| [0002](0002-mock-rails-dual-flag.md) | Dual-flag mock rails for staging demos |
| [0003](0003-postgres-persistence.md) | Postgres persistence with file fallback |
| [0004](0004-live-llm-guardrails.md) | Live LLM shared guardrails + retrieval |
| [0005](0005-compliance-drafts.md) | Phase 4 draft compliance docs (not certifications) |

When an ADR is superseded, add a line at the top linking to the replacement and set status to `Superseded`.
