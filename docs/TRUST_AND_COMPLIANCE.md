# Trust & Compliance — MyInstantAI Agents Marketplace

Single source of truth for security and multi-region compliance claims. The in-app Trust Center (`/trust`) mirrors this document with a four-pillar UI and **Live / Partial / Via provider / Planned** tags on every claim. **Prefer under-claiming over over-claiming in partner meetings.**

## Scope

| Layer | What it covers | What it does **not** cover |
|---|---|---|
| **Platform** | Auth, tenancy, audit, embed keys, OAuth token handling, headers, Azure path | SOC 2 certificate (planned), blanket “GDPR certified” |
| **Agent / market packs** | US CCPA/TCPA, EU GDPR, Africa POPIA-style, Asia PDPA-style prompts & guardrails | Legal advice; BAAs; automated DSAR fulfilment |
| **Deploy region** | Where the Container App + Postgres run | Per-tenant residency pin (roadmap) |

## Regions

| Pack | Frameworks (agent layer) | Notes |
|---|---|---|
| **US** | CCPA, TCPA; HIPAA caution on health families | BAA required before PHI workloads |
| **EU** | GDPR, ePrivacy norms | Erasure → human handoff; EU-only pin on Azure roadmap |
| **Africa (incl. ZA)** | POPIA-style / regional privacy | WhatsApp-first; ZA under Africa pack |
| **Asia** | PDPA-style / regional privacy | Opt-out and access via human handoff |

## Shipped controls (this repo)

1. OIDC Bearer verification (`MIAI_AUTH_MODE=oidc`) with `workspace_id` / `roles`
2. Workspace RBAC: `owner` · `admin` · `agent` · `readonly` on rent, wallet, configure, knowledge, OAuth, chat, DSAR
3. Platform operator gate on `/api/admin`
4. Workspace-scoped `/api/audit` (no cross-tenant leakage)
5. HMAC embed keys; embed chat requires live/rented agent; 30 req/min rate limit
6. OAuth PKCE + HMAC state; tokens **AES-256-GCM** at rest (`v2.` envelopes; `v1.` migrated on write)
7. `GET /api/dsar/export` — owner/admin JSON pack (no OAuth secrets)
8. Enforcing CSP + security headers (`apps/web/next.config.ts`)
9. Runtime erasure / injection defenses + Agent Studio **Test the guardrails** probes

## Honest language

**Say:** market-pack guardrails; deploy-time Azure region; human DSAR; HMAC-sealed tokens; SOC 2 planned.

**Do not say:** SOC 2 certified; GDPR-compliant platform; EU residency guaranteed today; automated right-to-be-forgotten in chat.

## Roadmap

| When | Item |
|---|---|
| Now | Trust Center, RBAC, embed hardening, headers, audit isolation |
| Next | AES-256-GCM token encryption, Key Vault, CSP enforce, DSAR export API |
| Azure cutover | Per-tenant region pin (EU / ZA / APAC options), App Insights SIEM |
| Post-GA | SOC 2 Type II, DPA + subprocessor schedule, breach SLA |

## Subprocessors (staging → production)

| Party | Role | Region |
|---|---|---|
| MyInstantAI | OIDC, wallet, model gateway | Customer Azure tenancy |
| Microsoft Azure | CA, Postgres, Key Vault, App Insights | Deploy-time region |
| Railway | Staging host | US (staging) |
| LLM via MIAI gateway | Inference | Per gateway policy |
| OAuth vendors | Connector auth | Vendor regions |

## Contact

Partner security / DPO: `security@myinstantai.com`

Related: `docs/CONNECTOR_OAUTH.md`, `docs/TECHNICAL_SPEC.md` §11, `docs/MARKET_PACKS.md`, `infra/azure/`.
