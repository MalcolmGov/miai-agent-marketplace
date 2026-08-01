# Monday commercial pack — MyInstantAI Agents

Leave-behind for commercial finalisation. Product demo lives at `/demo` on staging.

**Commercial model (proposal):** sell the **Agent Marketplace as a platform** under an **annual license** that includes the **full catalogue — 55 families × 4 market packs = 220 agents**.

| Component | Amount / split |
|---|---|
| Annual platform license | **$200,000 / year** (~$909 / agent / year) |
| Monthly support, maintenance & new agent development | **$30,000 / month** |
| Monthly agent rental revenue | **50% Move Digital · 50% MyInstantAI** |
| Monthly token top-up revenue | **20% Move Digital · 80% MyInstantAI** |

**Branded PDFs:** `docs/branded-pdfs/output/`  
- `MyInstantAI-x-MoveDigital-Partnership-Proposal.pdf` ← primary leave-behind  
- `MyInstantAI-Agents-One-Pager.pdf`  
- `MyInstantAI-Agents-Commercial-Leavebehind.pdf`  
- `MyInstantAI-Agents-Monday-Demo-Pilot6.pdf`  

Regenerate with `pnpm pdf:branded`.

**Staging:** https://miaiweb-production.up.railway.app  
**Trust Center:** `/trust` · **Roadmap:** `/roadmap` · **Demo script:** `/demo`

---

## 1. Commercial proposal (firmed for Monday)

**Platform annual license (primary) + monthly retainer + rev-share on end-customer usage**

| Component | Amount / split | Why |
|---|---|---|
| **Annual platform license** | **$200,000 / year** | Marketplace + full **220** agents day 1 (~$909 / agent / year) |
| **Monthly support & development** | **$30,000 / month** | Support, maintenance, new / feature agent development |
| **Agent rental (end-customer)** | **50% MD · 50% MIAI** | Catalogue IP + distribution partnership |
| **Token top-ups (end-customer)** | **20% MD · 80% MIAI** | Model/wallet economics sit with MyInstantAI |

Cutover onto OIDC / wallet / gateway / Azure is delivered under the partnership (retainer + license), not a separate SKU-limited pilot.

**Year-1 fixed floor (before rev-share):** $200k + $360k = **$560,000**.

---

## 2. Decisions to lock Monday

| # | Decision | Options | Our recommendation |
|---|---|---|---|
| 1 | **Product entitlement** | Subset vs **full 220** | **Full catalogue under annual platform license** |
| 2 | License term | Annual / multi-year | **Annual**, renewable |
| 3 | Exclusivity | None / market / vertical | Define if exclusive Agents marketplace for MIAI |
| 4 | IP | License vs assignment | **License** to MyInstantAI; Move Digital retains reusable IP |
| 5 | Operations | MD / MIAI / joint | **Joint** 90 days post-cutover, then named primary |
| 6 | SLAs | Hours + uptime on Azure | Draft after Azure owner named |
| 7 | Public launch date | — | Set target; staging credentials unblock Week 1 |

---

## 3. Pricing maths (for discussion)

### Platform license & retainer (partnership)

| Line | Amount |
|---|---|
| Annual platform license (220 agents) | **$200,000 / year** |
| Monthly support, maintenance & new agent development | **$30,000 / month** |
| Agent rental rev-share | **50% / 50%** |
| Token top-up rev-share | **20% MD / 80% MIAI** |

### End-customer token packs (marketplace wallet — already in product)

| Pack | USD | Tokens |
|---|---:|---:|
| Starter | 10 | 150,000 |
| Plus | 20 | 420,000 |
| Growth | 100 | 2,750,000 |
| Scale | 200 | 6,900,000 |

### Protocol rent bands (optional end-customer packaging later — not the license scope)

| Tier | USD / mo | EUR / mo |
|---|---:|---:|
| standard | 349 | 319 |
| pro | 699 | 649 |
| enterprise | 1,199 | 1,099 |

Catalogue claim (safe): **55 families × 4 market packs = 220 catalogue-ready agents** (see `CATALOGUE_READY.md`). Platform rails (SSO, live wallet, Azure) are integration work, not catalogue gaps.

---

## 4. Demo shortlist (Pilot 6) — UAT only, not commercial scope

These six are for **Monday demo depth** and Week‑3 UAT. The **license still covers all 220**.

| # | Family | Why in the room |
|---|---|---|
| 1 | Executive Assistant | Internal multi-step + calendar confirm |
| 2 | IT Helpdesk | KB → ticket → escalate |
| 3 | Dental Front Desk | Vertical booking + clinical handoff |
| 4 | Hotel Guest Concierge | Hospitality amenities + logged requests |
| 5 | Sales Qualifier | Lead capture + callback |
| 6 | Home Services Front Desk | Field ops book + notify dispatch |

In-app: `/demo` and catalogue **Pilot 6** filter (= demo shortlist).

---

## 5. Open asks (their side — Week 1 unblockers)

| Ask | Owner (name) | Status |
|---|---|---|
| Staging OIDC (issuer, client, audience) | | |
| Staging wallet API | | |
| Model gateway endpoint + auth | | |
| Azure subscription / region owner | | |
| Production hostname / DNS | | |
| WhatsApp WABA / BSP ownership | | |
| Commercial signatory + annual license number | | |

Without Auth + Wallet + Models in writing (even staging stubs), sprint stays documentation-heavy.

---

## 6. 30-day success criteria (reconfirm)

A MyInstantAI user can **SSO in → activate / configure an agent from the licensed catalogue → run a tool-backed conversation billed to your wallet → on your hostname.**

| Week | Outcome |
|---|---|
| 1 | Commercial principles (annual platform license) + staging rails received |
| 2 | Marketplace on staging OIDC / wallet / gateway |
| 3 | Domain + OAuth redirects; demo shortlist UAT; Live Ops green |
| 4 | Cutover rehearsal + go-live checklist |

---

## 7. Demo path (12–15 min) — mirror `/demo`

1. Catalogue brand — **220 agents under platform license**  
2. Smart search + optional Pilot 6 shortlist for depth  
3. Learn more → Rent / setup (studio path)  
4. Multi-step confirm-before-write in sandbox  
5. Actions / Slack (if connected)  
6. Trust Center — Live / Partial / Planned tags (under-claim)  
7. Agent Admin + Insights + custom request pipeline  

**Say once:** commercial = annual platform license for all 220; Pilot 6 is demo/UAT only. SSO and live MIAI wallet are cutover items.

---

## 8. Suggested Monday close

- [ ] **Annual platform license $200,000** = full 220 agents  
- [ ] **Monthly support & development $30,000**  
- [ ] Rev-share: **rent 50/50** · **tokens 20% MD / 80% MIAI**  
- [ ] Named owners: Auth, Wallet, Models, Azure, Commercial  
- [ ] Target date for staging credentials  
- [ ] Next working session booked  

—
**Move Digital** · Agent Marketplace delivery partner
