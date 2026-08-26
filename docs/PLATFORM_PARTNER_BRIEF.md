# MyInstantAI Agent Marketplace — Platform Overview & Integration Brief

> **Prepared for:** MyInstantAI — technical & integration review  
> **From:** Move Digital (Pty) Ltd — platform operator & IP owner  
> **Date:** 2026-08-25 · v1.0  
> **Scale:** 400,000+ authored lines · 500 production-grade agents (100 families × 5 markets) · 8,500+ behavioural evals · ~1,900 tool integrations · 5 delivery channels  
> **Stack:** Modern TypeScript / Next.js platform · Postgres · containerized & cloud-agnostic (Azure-ready)  
> **Confidential** — shared under the MyInstantAI × Move Digital partnership. Deeper technical detail and live testing are available through the evaluation sandbox; this brief intentionally omits source-level internals.

## How to read this brief

This is a partner-facing overview: **what the platform does, how it integrates with your identity, wallet, and model rails, and how it reaches production on your infrastructure.** It is deliberately high-level on internals — the source, the catalogue authoring, and the full engineering detail stay with Move Digital and are demonstrated through the live evaluation sandbox rather than documented here. Everything below is measured from the running platform.

## Contents

- [1. Executive Overview](#1-executive-overview)
- [2. What the Platform Does](#2-what-the-platform-does)
- [3. The Agent Catalogue](#3-the-agent-catalogue)
- [4. Integration & Rails](#4-integration-rails)
- [5. Security & Compliance Assurance](#5-security-compliance-assurance)
- [6. Solution Architecture & Deployment](#6-solution-architecture-deployment)
- [7. Service Levels, Support & Continuity](#7-service-levels-support-continuity)
- [8. Readiness](#8-readiness)

## 1. Executive Overview

The **MyInstantAI Agent Marketplace** is a running, multi-tenant platform pairing an **agent marketplace** with the **runtime that executes those agents**. A partner's customers browse a catalogue of AI agents, rent one, configure it — persona, knowledge, connected actions, branding — and run it, metered against a prepaid token wallet, across every major messaging and web surface. It serves two audiences from one platform: **business agents** rented per workspace, and **consumer specialists**, a personal-assistant line with durable memory.

It is a **licensable, operating platform — not a demo.** The full loop already runs end-to-end: browse → rent → configure → connect actions → add knowledge → chat → embed → meter. Moving from staging to production is **configuration, not construction** — the platform is built to accept your identity, wallet, and model endpoints through defined integration points, and to run under your brand and (optionally) inside your cloud.

### At a glance

| Dimension | Measure | | Dimension | Measure |
|---|---:|---|---|---:|
| Authored platform + catalogue | **400,000+ lines** | | Delivery channels | **5** |
| Production-grade agents | **500** | | Tool integrations (catalogue) | **~1,900** |
| Agent families × markets | **100 × 5** | | Connector / Action integrations | **16** |
| Behavioural eval cases | **8,500+** | | Consumer specialists | **17** |

> **What the scale means.** The catalogue — 500 agents, each with its own persona, knowledge, tools, guardrails, and test suite — is roughly three-quarters of the authored work and is the core licensed asset. The remainder is the runtime, marketplace, and integration platform that turns that catalogue into a metered, multi-tenant product.

## 2. What the Platform Does

The platform is a complete operating system for renting, running, and billing AI agents. Its capabilities:

- **Marketplace & catalogue.** A browsable, searchable storefront of 500 agents organised by family and market, with per-agent detail, tiering, and rental.
- **Agent Studio (configure).** Per-agent setup: name and branding, greeting, tone, knowledge (paste, website import, or document upload), connected actions, escalation/hand-off behaviour, and the domains an agent may be embedded on.
- **Chat runtime.** A production conversation engine that grounds answers in each agent's knowledge, calls tools/actions under per-persona guardrails, runs a bounded reasoning loop for higher tiers, and streams responses in real time.
- **Actions & connectors.** Agents take real action against external systems (calendars, email, messaging, commerce, accounting, support) through a secure OAuth connector framework.
- **Channels.** One agent reaches customers on web chat, an embeddable widget, Telegram, WhatsApp, a native-app WebView, and a machine-readable MCP interface.
- **Prepaid metering wallet.** Every reply is metered in tokens against a prepaid balance; usage is billed from a monthly statement and **fails closed** at zero — no unfunded usage is possible.
- **Operator console.** Workspace, member, and agent management, plus usage and activity visibility.
- **Trust Center.** An in-product surface that states, honestly, which capabilities are Live, Partial, or Planned.

## 3. The Agent Catalogue

The catalogue is the platform's crown-jewel asset: **500 agents = 100 families × 5 regional market packs** (United States, Europe, Africa incl. South Africa, Asia, Oceania), plus **17 consumer specialists**. It is quantified, tested, and regionalised — not a set of prompt templates.

### Each agent is a real runtime, not a prompt wrapper

Every agent ships as a self-contained package that carries:

- **A grounded persona** that answers only from the knowledge its owner gives it, switching automatically to retrieval as that knowledge grows.
- **Real tool actions** — the agent can look something up, book, send, or update in a connected system, not just talk.
- **Per-persona guardrails** — enforced in the runtime, not left to model discretion. A travel agent will not invent a fare; an IT-support agent will not touch a password or OTP; an insurance agent will not promise a payout.
- **A reasoning loop** (higher tiers) — a bounded look-up → act → answer cycle, credit-checked between steps.
- **Glass-box logging** — every action and plan is attributable to the owner.
- **A behavioural test suite** — the platform carries **8,500+ eval cases** (~15 per agent) covering grounded answers, confirm-before-write behaviour, and cross-tenant refusals. This regression harness is a core part of the quality IP and runs continuously.

### Regionalised and tiered

Each family ships as five **market packs** that encode local compliance and market conventions rather than one global prompt pretending to be local. Agents are offered in tiers (Standard / Pro / Enterprise) with corresponding capability and rental levels, and carry **~1,900 tool integrations** across the catalogue.

> The catalogue's authoring — the actual prompts, knowledge bases, guardrail definitions, and eval expectations — is Move Digital IP and is exercised through the sandbox rather than shipped as source.

## 4. Integration & Rails

This is the part your engineering team will care about most. The platform is **adapter-first**: it runs on mock rails in staging and swaps to your live services through defined integration points — a configuration change, not a rebuild. There are three rails and three ways to call the platform.

### The three rails you provide

| Rail | What you provide | Behaviour |
|---|---|---|
| **Identity** | An OIDC provider — issuer, audience, and JWKS (plus a sample token) | Users and workspaces authenticate through your identity; the platform verifies and scopes every request to the right tenant |
| **Wallet** | A prepaid-token API — debit, balance, and top-up endpoints | The platform meters every reply against your wallet and **fails closed** at zero balance; usage reconciles to a monthly statement in tokens |
| **Model** | A model gateway (base URL, auth, tool-calling) — or your own provider keys | The runtime routes all inference through your gateway; no model spend happens without a funded balance |

Because settlement is denominated in **tokens** — the same unit you already sell — there is no currency-conversion or reconciliation layer to build between your ledger and ours.

### Three ways to drive the platform

- **Partner REST API.** A documented, versioned REST API behind a single bearer credential, covering the lifecycle you would automate: rent an agent from the catalogue, deploy it for one of your merchants, give it knowledge, connect its actions, and pull the monthly usage statement.
- **MCP interface.** The platform speaks the Model Context Protocol, so your own assistant can rent and deploy an agent **conversationally** — a merchant asks your AI for a booking agent and it provisions one, no form required. Operations exposed: list catalogue, rent, deploy, list deployments, update knowledge, get statement.
- **Embeddable widget.** A one-line script tag with zero dependencies that derives its own origin at runtime — so it serves from your domain with no code change — plus the same widget loading natively inside a mobile WebView.

### Per-merchant configuration

Every merchant you onboard becomes an isolated tenant with its own branding, knowledge, channels, and domain allow-list, configurable through the API or the console: display name, greeting, accent colour, persona, tone, knowledge, escalation behaviour, and permitted domains.

### Integration conventions

Your engineers integrate against a documented, versioned REST API and an MCP interface — both behind a single bearer credential, with separate sandbox and production environments. The full API reference (an OpenAPI specification), the wallet and model-gateway contracts, the webhook events, and a persistent integration sandbox with test credentials are handed to your team under NDA when integration begins. Usage is metered deterministically per tenant and reconciles to the monthly statement.

## 5. Security & Compliance Assurance

The platform is built for a regulated, multi-tenant, competitor-adjacent environment. The controls below are in place today; the specifics are available to your security team under the sandbox/NDA.

### Identity, isolation & secrets

- **Authentication** via OIDC for the business line and a signed, verified session for the consumer line; signed keys for embeds and signed, timestamped signatures for webhooks.
- **Structural tenant isolation** — every read and write is scoped to an owning tenant. Cross-tenant reads are not possible, an owned agent cannot be re-claimed, and one merchant's data is invisible to another — including two competitors running on the same platform.
- **Encrypted credential storage** — connector and action credentials are sealed at rest and are never returned by the API; secret reads come back redacted.

### Platform hardening

- Transport and content-security policies; an embed policy that only allows a tenant's own registered domains.
- Outbound-request protection that blocks calls to internal/reserved network ranges (SSRF defence).
- A structural prompt-injection posture: visitor text cannot forge tool calls, tool results re-enter strictly as data, and external tool descriptions are sanitised before use.
- Glass-box auditability — every action and plan is logged and attributable.

### Privacy & regional compliance

- **Data-subject rights** — export and erasure, consent capture, audit logging, retention controls, PII handling, and AI-use disclosure.
- **Regional compliance packs** encode US (CCPA/TCPA), EU (GDPR), Africa (POPIA incl. South Africa), Asia (PDPA-style), and Oceania (AU/NZ) requirements at the market-pack level.
- A **Trust Center** presents capability status with honest Live / Partial / Planned tagging rather than blanket claims.

### Data protection & residency

- **Data residency follows your infrastructure.** The platform is deployed into your Azure tenancy, so all tenant data resides in the Azure region(s) you provision — for MyInstantAI, **Azure West US 3 (Phoenix, Arizona)**, nearest your base and keeping data in-country. Additional regions can be added if a specific market requires in-region residency. Residency and infrastructure-level regional compliance are therefore a property of your Azure hosting, not a separate vendor commitment.
- **Regional regulatory behaviour is built into the catalogue.** Each agent family's market packs encode local rules (US CCPA/TCPA, EU GDPR, Africa POPIA incl. ZA, Asia PDPA, Oceania) — how the agent behaves, discloses, and handles data per region.
- **Data Processing Addendum.** A signable DPA covers Move Digital's role as the operator of the platform running inside your tenancy; the external processors in the data path are largely your own choices (your Azure region, your model gateway, your messaging/BSP provider) and are listed for review.
- **Encryption.** Data is encrypted in transit (TLS 1.2+) and at rest (AES-256) — database, backups, and the credential envelope — using your Azure-managed, rotated keys.
- **Incident notification.** Confirmed incidents affecting your data are notified without undue delay (target ≤ 72 hours) with impact scope and remediation status, so you can meet your own GDPR / POPIA obligations.

## 6. Solution Architecture & Deployment

The platform is deployed **into your Azure tenancy** — you own the data plane, the region, and data residency; Move Digital operates the software running inside it. It ships as a container backed by **Azure Database for PostgreSQL**, integrates with your identity, wallet, and model rails, and reaches your customers across five channels.

```svg
<svg class="arch" viewBox="0 0 820 590" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Solution architecture">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#7c8aa0"/>
    </marker>
  </defs>
  <rect x="200" y="16" width="612" height="52" rx="12" fill="#f5f7fb" stroke="#e2e8f2"/>
  <text x="506" y="39" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="15" font-weight="800" fill="#0f1724">Merchants &amp; end customers</text>
  <text x="506" y="56" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="11" fill="#64748b">browse · rent · configure · chat</text>
  <line x1="506" y1="68" x2="506" y2="90" stroke="#7c8aa0" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="200" y="92" width="612" height="316" rx="16" fill="#fcfdff" stroke="#1d4ed8" stroke-width="1.5"/>
  <rect x="200" y="92" width="612" height="34" rx="16" fill="#0d1b2e"/>
  <rect x="200" y="110" width="612" height="16" fill="#0d1b2e"/>
  <text x="220" y="114" font-family="Manrope,Arial,sans-serif" font-size="11.5" font-weight="800" letter-spacing="1" fill="#8fb3ff">YOUR AZURE TENANCY · WEST US 3 (PHOENIX, ARIZONA)</text>
  <rect x="228" y="150" width="556" height="86" rx="12" fill="#2563eb"/>
  <text x="506" y="186" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="17" font-weight="800" fill="#ffffff">MyInstantAI Agent Marketplace</text>
  <text x="506" y="208" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="11.5" fill="#cfe0ff">Marketplace UI · Agent Runtime — containerised</text>
  <rect x="228" y="262" width="270" height="80" rx="12" fill="#eef3fc" stroke="#dbe6fb"/>
  <text x="363" y="296" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="13" font-weight="800" fill="#0f1724">Azure Database for PostgreSQL</text>
  <text x="363" y="314" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="10.5" fill="#64748b">managed · encrypted at rest</text>
  <rect x="514" y="262" width="270" height="80" rx="12" fill="#f5f7fb" stroke="#e2e8f2"/>
  <text x="649" y="296" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="13" font-weight="800" fill="#0f1724">Cache — optional</text>
  <text x="649" y="314" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="10.5" fill="#64748b">horizontal scale-out</text>
  <rect x="228" y="356" width="556" height="36" rx="8" fill="#f5f7fb" stroke="#e2e8f2"/>
  <text x="245" y="379" font-family="Manrope,Arial,sans-serif" font-size="10.5" fill="#46556a"><tspan font-weight="800" fill="#0f1724">Secured tenancy</tspan>  ·  private VNet · TLS 1.2+ in transit · AES-256 at rest · tenant-isolated per merchant</text>
  <text x="16" y="112" font-family="Manrope,Arial,sans-serif" font-size="11" font-weight="800" letter-spacing="1" fill="#1d4ed8">YOUR RAILS</text>
  <rect x="16" y="126" width="168" height="52" rx="10" fill="#ffffff" stroke="#cbd5e6"/>
  <text x="30" y="150" font-family="Manrope,Arial,sans-serif" font-size="12.5" font-weight="800" fill="#0f1724">Identity — OIDC</text>
  <text x="30" y="167" font-family="Manrope,Arial,sans-serif" font-size="10" fill="#64748b">issuer · audience · JWKS</text>
  <rect x="16" y="190" width="168" height="52" rx="10" fill="#ffffff" stroke="#cbd5e6"/>
  <text x="30" y="214" font-family="Manrope,Arial,sans-serif" font-size="12.5" font-weight="800" fill="#0f1724">Wallet API</text>
  <text x="30" y="231" font-family="Manrope,Arial,sans-serif" font-size="10" fill="#64748b">debit · balance · top-up</text>
  <rect x="16" y="254" width="168" height="52" rx="10" fill="#ffffff" stroke="#cbd5e6"/>
  <text x="30" y="278" font-family="Manrope,Arial,sans-serif" font-size="12.5" font-weight="800" fill="#0f1724">Model gateway</text>
  <text x="30" y="295" font-family="Manrope,Arial,sans-serif" font-size="10" fill="#64748b">inference · tool-calling</text>
  <line x1="100" y1="306" x2="100" y2="320" stroke="#7c8aa0" stroke-width="1.3" marker-end="url(#arr)"/>
  <rect x="16" y="322" width="168" height="46" rx="10" fill="#f5eefb" stroke="#e6d6f5"/>
  <text x="30" y="343" font-family="Manrope,Arial,sans-serif" font-size="10.5" font-weight="800" fill="#6b21a8">Your LLM providers</text>
  <text x="30" y="359" font-family="Manrope,Arial,sans-serif" font-size="8.5" fill="#64748b">OpenAI · Anthropic · Azure OpenAI</text>
  <line x1="184" y1="152" x2="226" y2="182" stroke="#7c8aa0" stroke-width="1.4" marker-end="url(#arr)"/>
  <line x1="184" y1="216" x2="226" y2="200" stroke="#7c8aa0" stroke-width="1.4" marker-end="url(#arr)"/>
  <line x1="184" y1="280" x2="226" y2="216" stroke="#7c8aa0" stroke-width="1.4" marker-end="url(#arr)"/>
  <line x1="506" y1="408" x2="506" y2="434" stroke="#7c8aa0" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="200" y="436" width="612" height="60" rx="12" fill="#eefaf0" stroke="#cdebd6"/>
  <text x="506" y="460" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="11.5" font-weight="800" letter-spacing="1" fill="#15803d">CHANNELS</text>
  <text x="506" y="481" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="12.5" font-weight="700" fill="#0f1724">Web · Embed widget · Telegram · WhatsApp · MCP</text>
  <line x1="506" y1="496" x2="506" y2="518" stroke="#7c8aa0" stroke-width="1.5" marker-end="url(#arr)"/>
  <rect x="200" y="520" width="612" height="52" rx="12" fill="#f5f7fb" stroke="#e2e8f2"/>
  <text x="506" y="543" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="14" font-weight="800" fill="#0f1724">End customers</text>
  <text x="506" y="560" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="11" fill="#64748b">on their own WhatsApp numbers, websites &amp; apps</text>
</svg>
```

*Solution architecture — the platform runs inside your Azure region; your rails plug in as configuration; your customers reach agents over their own channels.*

### How it deploys into your Azure

- The marketplace and agent runtime run as a **container** in your subscription and region (**Azure West US 3**, in Phoenix, Arizona — nearest your base), backed by **managed Azure Postgres**; an optional cache supports horizontal scale.
- Your **rails plug in as configuration** — identity (OIDC), the wallet API, and the model gateway (fronting your LLM providers — OpenAI, Anthropic, or Azure OpenAI). All inference routes through your gateway on your keys; every reply meters against your wallet and fails closed at zero. Connections are TLS-secured within your private network.
- Your customers reach agents over **web, an embeddable widget, Telegram, WhatsApp, and MCP** — on their own numbers and domains.
- The platform is **multi-tenant**: each merchant is isolated with its own branding, knowledge, and domain allow-list.

### Getting there

Deploying into your Azure is enabled by a defined **managed-Postgres migration** — the platform's data plane moves onto Azure Database for PostgreSQL. Once your Azure subscription, region, and managed Postgres are provisioned and the container is deployed, wiring your rails to a billed turn follows a short fast-track:

| Stage | Focus |
|---|---|
| Provision | Azure subscription, region & managed Postgres · platform container deployed into your tenancy |
| Days 1–3 | Identity (OIDC) login working end-to-end |
| Days 4–7 | Wallet debit + model gateway on one hero agent — activate → chat → bill |
| Days 8–11 | Custom domain + redirects · UAT on a go-live shortlist |
| Days 12–14 | Cutover rehearsal · mock rails off · **live in your Azure** |

*A faster interim launch — Move Digital-hosted under your domain — is available if you want a branded marketplace live within days while the Azure migration completes.*

### What we need from you to go live

An **Azure** subscription, target region, and managed Postgres · production **OIDC** (issuer, audience, JWKS, sample token) · production **wallet API** (debit / balance / top-up) · **model gateway** (base URL, auth, tool-calling) · production hostname/DNS · **WhatsApp** business number (WABA/BSP).

### Operating it

A machine-readable health/readiness endpoint reports live status and fails closed when degraded; usage is visible per tenant and reconciles to the monthly token statement; the platform is stateless and scales horizontally within your Azure.

## 7. Service Levels, Support & Continuity

Because MyInstantAI provides the Azure hosting and funds the platform while Move Digital operates the software, the commitments below cover Move Digital's **operational** service — support, incident response, and the availability of the operated platform on healthy infrastructure. Infrastructure uptime itself is a function of your Azure hosting. The binding figures are fixed in the agreement.

### Service level & support

| Commitment | Target |
|---|---|
| Operated-platform availability | **99.9%** target on healthy infrastructure, with a service-credit schedule |
| **Sev-1** — production down or billing halted | 24×7, acknowledged within 30 minutes, worked continuously to restore |
| **Sev-2** — degraded service | Same-business-day response |
| **Sev-3** — question or minor issue | Next-business-day response |
| Escalation | A named escalation chain plus a dedicated integration-support channel |

### Responsibilities — host vs operate

MyInstantAI provides and funds the hosting (cloud subscription, region, and the identity / wallet / model rails). Move Digital operates the platform — deployment, monitoring, incident response, change management, maintenance windows, and new agents. During an incident, Move Digital detects, drives resolution, and communicates status; production changes and maintenance are coordinated with and notified to MyInstantAI in advance. A full responsibility matrix (RACI) is agreed at contracting.

### Continuity & recovery

Managed Postgres is backed up on a defined cadence with point-in-time recovery; targets of **RTO ≤ 4 hours** and **RPO ≤ 15 minutes**; a documented failover posture and a periodic disaster-recovery test. A status page and change-notification policy keep your team informed of availability and planned maintenance.

### Portability & exit

Your tenant configuration, knowledge bases, and usage history are exportable in a standard machine-readable format on request and at termination, on an agreed timeline — no lock-in. Move Digital's catalogue and source IP are excluded from export, consistent with the licensing model.

## 8. Readiness

Honest status of the platform as it stands, using the same Live / Partial / Planned language the product ships:

- **Live today:** the full marketplace and configuration loop; the 500-agent catalogue and its 8,500+ evals; the runtime with guardrails, retrieval, and fail-closed metering; five delivery channels; the health/readiness endpoint; and sandbox chat that runs with zero of your credentials.
- **Live code, awaiting your credentials:** identity (OIDC), wallet debit, and live model providers — each a configuration switch, not a build.
- **Partial:** live execution across the full **16-connector** set is rolling out from an initial live set (e.g. Slack, webhook, MCP); the ~1,900 figure counts catalogue tool *definitions*, not live connectors.
- **Enabling step:** deployment into your Azure tenancy follows the managed-Postgres migration — a defined, phased piece of work — after which the rails wiring is the short fast-track above.

**In short:** the platform is ready for a staged handover onto your rails — identity, wallet, and model — with a two-week path to a branded, billing marketplace on your domain. The engineering depth behind every claim here is available to your team through the evaluation sandbox and a technical working session, without transferring source or catalogue IP.

*Prepared by Move Digital (Pty) Ltd — platform operator and IP owner — for MyInstantAI. Confidential.*
