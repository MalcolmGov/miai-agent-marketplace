# MyInstantAI × Move Digital — Agents Marketplace Partnership Kickoff Brief

**Date:** 31 July 2026  
**From:** Move Digital  
**To:** MyInstantAI leadership / product / platform  
**Purpose:** Convert partnership interest into a scoped 30-day integration kickoff.

---

## 1. What’s already delivered

Move Digital has built a production-oriented **Agent Marketplace** ready to plug into MyInstantAI rails:

| Capability | Status |
|---|---|
| Catalogue | **55 agent families × 4 market packs (US / EU / Africa / Asia) = 220 agents**, catalogue-ready |
| Product loop | Browse → rent → configure → Actions → knowledge → sandbox/live chat → embed → prepaid tokens |
| Live connectors (staging) | Slack, Google Calendar, Gmail, Calendly |
| Platform adapters | Auth (OIDC), wallet (HTTP), model gateway — mockable until your credentials land |
| Ops path | Azure Bicep (Container Apps, Postgres, Key Vault, App Insights) + Railway→Azure runbook |
| Staging | `https://miaiweb-production.up.railway.app` |

Supporting packs (can share on request): Platform Integration Contract, Technical Spec, Migration P0/P1 + Runbook, Connector OAuth guide.

**What remains is not invention — it is wiring your identity, wallet, models, and Azure tenancy, plus commercial terms.**

---

## 2. Proposed partnership shape (to confirm)

| Topic | Proposal for discussion |
|---|---|
| Role | Move Digital delivers & integrates the Agents Marketplace; MyInstantAI owns customer auth, wallet, models, and primary Azure tenancy |
| Product home | Agents live under MyInstantAI domain (e.g. `app.myinstantai.com/agents`) as a first-party surface |
| Catalogue IP | Agent packages remain Move Digital deliverables under agreed license / assignment (TBD in term sheet) |
| Connectors | OAuth apps can sit under MyInstantAI orgs for production; Move Digital operates staging |
| Go-live | Staging on your rails → production cutover per Migration Runbook |

---

## 3. Ask list — needed from MyInstantAI to start

Please nominate owners and target dates for:

1. **OIDC** — issuer, audience, JWKS, sample JWT with `workspace_id` / `user_id` / `roles`  
2. **Wallet API** — base URL, API key, debit/balance/top-up contract + sample responses; pause-on-zero semantics confirmed  
3. **Model gateway** — base URL, auth, tool-calling support, model alias map  
4. **Azure** — subscription / resource group, who runs `az deployment`, Key Vault access model  
5. **DNS / TLS** — production hostname for Agents + embed (`agent.js`)  
6. **WhatsApp** — WABA / BSP ownership (MyInstantAI vs Move Digital)  
7. **Commercial** — term sheet principles (see §5) and target partnership / go-live dates  

Without items 1–3 in writing (even staging stubs), the first sprint stays infra-documentation only.

---

## 4. Proposed 30-day plan

| Week | Outcome |
|---|---|
| **Week 1** | Kickoff call; lock commercial principles; receive staging OIDC + wallet + model endpoints; confirm Azure owner + domain |
| **Week 2** | Marketplace pointed at your staging rails (`auth=oidc`, `wallet=http`, `model=gateway`); smoke: login → rent → chat → debit |
| **Week 3** | Custom domain + OAuth redirect URIs updated; 6 pilot agents UAT on your staging; Live Ops / health green |
| **Week 4** | Cutover rehearsal (Migration Runbook); production go-live checklist; backlog for HubSpot/Shopify/Microsoft + WhatsApp |

Success criteria for day 30: **a MyInstantAI user can sign in with your SSO, rent an agent, run a live tool-backed conversation billed against your wallet, on your hostname.**

---

## 5. Commercial options (for discussion)

Please indicate preferred position(s) — hybrid models are welcome:

| Option | How it works | Best when |
|---|---|---|
| **A. Fixed delivery fee** | One-time (or phased) build/integration fee for v1 cutover onto your rails | You want a clean capex-style engagement |
| **B. Monthly retainer** | Ongoing platform + catalogue ops / support after go-live | You want Move Digital to operate / co-operate production |
| **C. Rev-share on agent rent** | % of monthly agent entitlement / rent revenue | Agents become a material SKU on your price list |
| **D. Share of token spend** | % of prepaid token wallet consumption attributed to Agents | Token economics are the primary monetisation |
| **E. Hybrid (recommended)** | Smaller delivery fee + retainer and/or rev-share (rent and/or tokens) | Aligns delivery risk with long-term upside |

Also confirm:

1. **v1 scope** — full 220-SKU catalogue at launch vs pilot bundle first?  
2. **Exclusivity** — exclusive Agents marketplace for MyInstantAI in defined markets/verticals?  
3. **IP** — license vs assignment of agent packages and connector presets?  
4. **Operations** — who runs production after cutover (Move Digital / MyInstantAI / joint)?  
5. **SLAs** — uptime and support hours once on Azure?  
6. **Timeline** — desired public launch date?

---

## 6. Suggested kickoff agenda (60 minutes)

1. Confirm partnership intent and decision-makers (10 min)  
2. Walk ask list — assign owners (15 min)  
3. Agree v1 scope + commercial option(s) from §5 (15 min)  
4. Lock 30-day plan and success criteria (10 min)  
5. Next actions & shared channel (10 min)  

---

## 7. Immediate next step

Please reply with:
- Kickoff meeting slot (this week / next)  
- Named owners for Auth, Wallet, Models, Azure, Commercial  
- Preferred commercial option(s) from §5 (even provisional)  
- Any red lines on IP, exclusivity, or launch date  

Move Digital is ready to start Week 1 as soon as staging credentials and commercial principles are confirmed.

—
**Move Digital** · Agent Marketplace delivery partner
