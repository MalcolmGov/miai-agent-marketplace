# Commercial pack — MyInstantAI Agents partnership

Leave-behind for **commercial finalisation and go-live**. Product staging: `/demo` (go-live pack) and catalogue **Go-live 100**.

**Commercial model:** sell the **Agent Marketplace as a platform** under an **annual license** that includes the **full catalogue — 100 families × 5 market packs = 500 agents**. End customers get **agents free**; monetisation is **prepaid token top-ups**. **Go-live 100** are the families we stand behind for customer production (featured **Go-live 18** for deep demos).

| Component | Amount / split |
|---|---|
| Annual platform license | **$200,000 / year** (~$400 / agent / year) |
| Monthly retainer (4 FTE pod) | **$30,000 / month** |
| Agent rental (end-customer) | **None** — agents offered free |
| Token top-up revenue | **20% Moove Digital · 80% MyInstantAI** |

**Branded PDFs:** `docs/branded-pdfs/output/`  
- `MyInstantAI-x-MoveDigital-Partnership-Proposal.pdf` ← primary leave-behind  
- `MyInstantAI-Agents-One-Pager.pdf`  
- `MyInstantAI-Agents-Commercial-Leavebehind.pdf`  

Regenerate with `pnpm pdf:branded`.

**Staging:** https://miaiweb-production.up.railway.app  
**Trust Center:** `/trust` · **Roadmap:** `/roadmap` · **Go-live pack:** `/demo` · **Live quality:** `/quality`

---

## 1. Commercial proposal (agreement path)

**Platform annual license + 4-FTE monthly retainer + token rev-share only**

| Component | Amount / split | Why |
|---|---|---|
| **Annual platform license** | **$200,000 / year** | Marketplace + full **500** agents day 1 (~$400 / agent / year) |
| **Monthly retainer** | **$30,000 / month** | Dedicated **4 FTE** pod: onboarding, support, maintenance, agent factory |
| **Agent rental** | **Not charged** | Aligns to MIAI GTM — free agents, monetise on tokens |
| **Token top-ups** | **20% MD · 80% MIAI** | Single upside meter; no double charge |

Cutover onto OIDC / wallet / gateway / Azure is delivered under the partnership (retainer + license).

**Year-1 fixed floor (before rev-share):** $200k + $360k = **$560,000**.

---

## 2. Monthly retainer scope — 4 FTE ($30,000)

**Purpose:** Keep Agents production-ready, onboard MyInstantAI business customers, and continuously expand/improve the catalogue under the annual platform license.

### 2.1 Named delivery pod

| Role | FTE | What they do |
|---|---:|---|
| **Customer ops / onboarding** | **2.0** | Own the business-customer journey at volume: activate agents, configure knowledge & channels, go-live checklists, training (group + 1:1), office hours, ticket triage, customer success follow-ups; hand off to eng when blocked |
| **Engineering** | **2.0** | Full technical lane: **integrations** (OAuth/Actions, webhook/MCP, Install, cutover onto MIAI OIDC/wallet/gateway) **plus** agent factory (bugs, maintenance, workflows, Depth upgrades, new/enhanced families), evals/regression, and go-live certify |
| **Total** | **4.0** | Named backups; capacity exclusive to this partnership |

**Day-to-day split (illustrative):** ~50% ops/onboarding · ~50% engineering (integrations + catalogue/runtime + QA). Within engineering, expect roughly **~40% integrations/support · ~60% agent factory & quality** depending on cutover vs steady state.

### 2.2 Customer onboarding & enablement (ops)

**Included (fair-use each month):**
- Onboarding for up to **12 new business tenants**
- Setup support: activate/configure, knowledge, Actions/OAuth, Install (web/app), first live test
- Training: **2 sessions / month** (group or customer-specific, 60–90 min)
- Office hours: **6 hours / week** shared channel
- Severity triage for customer go-lives during business hours

**Not included (separate SOW):** custom enterprise builds beyond supported connectors; 24/7 follow-the-sun; on-site multi-week professional services.

### 2.3 Support, maintenance & platform health

**Included:**
- Bug fixes for licensed Agents runtime, catalogue defects, connector regressions
- Security/patch maintenance for Moove Digital–owned Agents codebase
- Compatibility upkeep with MIAI OIDC / wallet / gateway **interfaces** (MIAI owns core platform)
- Keep CI / catalog integrity / go-live certification green for in-scope packs
- Monthly status report: incidents, fixes, backlog, agent-factory output

**Service targets (draft — finalise with Azure owner):**

| Severity | Response | Workaround / fix target |
|---|---|---|
| S1 – production down / data risk | 2 business hours | Same day / next business day |
| S2 – major feature broken | 1 business day | 3 business days |
| S3 – minor / cosmetic | 3 business days | Next release window |

### 2.4 Agent factory — monthly credits

**Commitment: 10 Agent Credits / month** (unused credits roll max 1 month).

| Work type | Credits | Done means |
|---|---:|---|
| **New family** (greenfield) | 3–5 | Package + tools + evals + primary market pack + pilot notes; workflow if write-path |
| **Market pack localisation** | 1 | Localised pack for an existing family (EU / Africa / Asia / Oceania) |
| **Depth upgrade** | 2–3 | Workflow + confirm-before-write + connector proof path + tests |
| **Material enhancement** | 1–2 | New tools/knowledge/evals; regression green |
| **Minor fix / content tune** | 0.25–0.5 | Prompt/knowledge/eval patch |

**Typical monthly output:** **6–10 catalogue SKUs / improvements** (mix of localisations, enhancements, depth upgrades) **or** ~**2 greenfield families** + maintenance — jointly prioritised with MyInstantAI.

Over-capacity → change order or credit top-up pack.

### 2.5 Governance

- Monthly steering (60 min): priorities, credit burn, tenant health  
- Shared backlog  
- Reporting: tenants onboarded, tickets closed, credits consumed, agents shipped  

### 2.6 Paste-ready commercial wording

> **Monthly Retainer — $30,000**  
> Includes a dedicated Moove Digital Agents pod of **4.0 FTE** (**2× Customer ops / onboarding** + **2× Engineering**). Ops own customer setup, training, and go-live enablement under fair-use caps. Engineering covers **integrations** (OAuth/Actions, webhook/MCP, Install, cutover onto MIAI rails), production support/maintenance, and an Agent Factory of **10 credits per month** (typically **6–10 catalogue improvements/SKUs**). End-customer agents are free; upside is via token rev-share only. Excludes MyInstantAI core platform engineering and work beyond monthly credit/fair-use caps.

---

## 3. Decisions to lock (commercial close)

| # | Decision | Options | Our recommendation |
|---|---|---|---|
| 1 | **Product entitlement** | Subset vs **full 500** | **Full catalogue under annual platform license** |
| 2 | License term | Annual / multi-year | **Annual**, renewable |
| 3 | End-customer monetisation | Rent + tokens vs **tokens only** | **Tokens only** — agents free |
| 4 | Exclusivity | None / market / vertical | Define if exclusive Agents marketplace for MIAI |
| 5 | IP | License vs assignment | **License** to MyInstantAI; Moove Digital retains reusable IP |
| 6 | Operations | MD / MIAI / joint | **Joint** 90 days post-cutover, then named primary |
| 7 | SLAs | Hours + uptime on Azure | Draft after Azure owner named |
| 8 | Public launch date | — | Set target; staging credentials unblock Week 1 |

---

## 4. Pricing maths (for discussion)

### Platform license & retainer (partnership)

| Line | Amount |
|---|---|
| Annual platform license (500 agents) | **$200,000 / year** |
| Monthly retainer (4 FTE) | **$30,000 / month** |
| Agent rental rev-share | **None** |
| Token top-up rev-share | **20% MD / 80% MIAI** |

**Token revenue definition:** net prepaid top-ups (or Agents-metered consumption) attributed to the Agents product, after refunds and chargebacks. MyInstantAI reports monthly; remittance within 30 days of month-end.

### End-customer token packs (marketplace wallet — already in product)

| Pack | USD | Tokens |
|---|---:|---:|
| Starter | 10 | 150,000 |
| Plus | 20 | 420,000 |
| Growth | 100 | 2,750,000 |
| Scale | 200 | 6,900,000 |

Catalogue claim (safe): **100 families × 5 market packs = 500 catalogue-ready agents** (see `CATALOGUE_READY.md`). Platform rails (SSO, live wallet, Azure) are integration work, not catalogue gaps.

---

## 5. Go-live wave (100 families) — production stand-behind

**Go-live 100** are the families we stand behind for customer production. **Go-live 18** (Clusters A–C) remain the featured deep-demo set. The **license still covers all 500**.

In-app: `/demo` (go-live pack) and catalogue **Go-live 100** filter (`/?pilot=1`).

Certify: `pnpm certify:golive` · expand live proofs: `docs/WAVE4_LIVE_CONNECTORS.md`.

See `docs/PILOT_PRODUCTION_BAR.md`, `docs/PARALLEL_WORKSTREAMS.md`, `docs/CLAUDE_HANDOFF.md`.

| Cluster | Families |
|---|---|
| A | Executive Assistant, IT Helpdesk, Dental Front Desk, Hotel Guest, Sales Qualifier, Home Services |
| B | Restaurant & Takeaway, Salon Booking, Clinic Front Desk, Customer Support, Delivery Tracking, Trades Receptionist |
| C | Events Venue, Onboarding Buddy, Accounting Practice, Building Management, Gym Membership, Pharmacy |
| +37 | Banking, insurance, HR, travel, retail, education — see `/demo` |
| +45 | Remaining Depth-strong verticals — full Go-live 100 |

---

## 6. Open asks (their side — cutover unblockers)

| Ask | Owner (name) | Status |
|---|---|---|
| Staging OIDC (issuer, client, audience) | | |
| Staging wallet API | | |
| Model gateway endpoint + auth | | |
| Azure subscription / region owner | | |
| Production hostname / DNS | | |
| WhatsApp WABA / BSP ownership | | |
| Commercial signatory + annual license number | | |

Without Auth + Wallet + Models in writing (even staging stubs), production cutover cannot complete.

---

## 7. 30-day success criteria (production)

A MyInstantAI user can **SSO in → activate / configure an agent from the licensed catalogue → run a tool-backed conversation billed to your wallet → on your hostname.**

| Week | Outcome |
|---|---|
| 1 | Commercial agreement principles + staging rails received |
| 2 | Marketplace on staging OIDC / wallet / gateway |
| 3 | Domain + OAuth redirects; Go-live 100 verified; Live Ops green |
| 4 | Cutover rehearsal + production go-live checklist |

---

## 8. Commercial walkthrough (12–15 min) — mirror `/demo`

1. Catalogue — **500 agents under platform license** (no list-price rent on cards)  
2. Smart search + **Go-live 100** stand-behind filter  
3. Learn more → Setup path (studio)  
4. Multi-step confirm-before-write  
5. Actions / live connectors (Calendar, Slack, CRM as available)  
6. Trust Center + Live quality scoreboard  
7. Insights + History + Workspace governance  

**Say once:** commercial = annual platform license for all 500 + 4-FTE retainer; end customers use agents free and top up tokens; SSO and live MIAI wallet are cutover items on their rails.

---

## 9. Commercial close checklist

- [ ] **Annual platform license $200,000** = full 500 agents  
- [ ] **Monthly retainer $30,000** = **4 FTE** pod + 10 agent credits / month  
- [ ] End-customer model: **agents free** · rev-share **tokens 20% MD / 80% MIAI** only  
- [ ] Named owners: Auth, Wallet, Models, Azure, Commercial  
- [ ] Target date for staging credentials  
- [ ] Next working session booked  

—
**Moove Digital** · Agent Marketplace delivery partner
