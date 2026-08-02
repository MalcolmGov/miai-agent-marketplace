# MyInstantAI handover — test pack

**Purpose:** evidence pack before engineering handover to the MyInstantAI team.  
**Staging:** https://miaiweb-production.up.railway.app  
**Last full automated run:** 2026-08-02 · **78/78 Playwright passed** (~27s) · commit `feb6d43`  
**Command:** `pnpm handover:staging`

Also run locally before sign-off:

```bash
pnpm run ci                 # unit + catalog integrity + static evals
pnpm handover:staging       # smoke + functional + UAT + handover APIs
```

Human companion: [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md). Framework: [`TESTING.md`](./TESTING.md).

---

## Coverage summary

| Layer | Count | Status |
|---|---:|---|
| Smoke (`@smoke`) | included | Pass |
| Functional (`@functional`) | included | Pass |
| UAT (`@uat`) | included | Pass |
| Handover extras (`@handover`) | included | Pass |
| **Playwright total** | **78** | **Pass** (2026-08-02) |
| Local `pnpm run ci` | — | ✅ Pass (2026-08-02) |
| Manual UAT checklist | B1–B10 + C | Eng guided ✅; product sign-off pending |

---

## Acceptance criteria (automated evidence)

| Criterion | How proven |
|---|---|
| Staging healthy (not failing); Postgres store ping | `health` + `health-hardening` |
| Redis B+ (`ok` when configured) | `health-hardening`, `acceptance-bar` |
| 500 agents × 5 markets; no ZA pack/chip | `catalog`, `markets-za-fold`, `acceptance-bar` |
| Security headers + CSP nonce / no script unsafe-inline | `security-headers` |
| OpenAPI stub present | `openapi` |
| Embed script + SRI | `embed` |
| Invalid app/embed keys rejected | `app-channel`, `embed-chat-contract` |
| Unsigned webhook rejected (HMAC-only) | `webhook-sink` |
| Rent + configure knowledge | `rent`, `studio-setup`, `knowledge-contract` |
| Chat happy path + correlation id | `chat-contract` |
| Guardrail refusals (jailbreak, card, cross-tenant) | `guardrail-refusals`, `refusal-path` |
| Wallet readable; readonly cannot top-up/chat | `wallet-contract`, `chat-contract` |
| Consent + DSAR export (no token leak); erase gated | `consent-contract`, `dsar-contract` |
| OAuth status, insights, history | `oauth-status`, `insights-history` |
| Diligence pages (legal, cookies, DP, roadmap, ops…) | `diligence-pages`, `secondary-pages` |
| Partner journey browse→rent→chat→install | `partner-demo-journey` |
| Go-live 100 filter | `catalogue-filters`, `partner-demo-journey` |
| Go-live hero studio shells (6 agents) | `golive-hero-matrix` |
| Mobile shell (no H-overflow; studio try fits) | `mobile-responsive` |

---

## Automated scenario index (78)

### API / security
- Health, health hardening, security headers, OpenAPI  
- Catalog 500 + US ~100 + ZA⊂Africa  
- Embed JS/SRI + embed chat 401/400 + OPTIONS  
- App channel page + invalid key  
- Rent, chat (400/403/200), guardrail refusals ×3  
- Wallet GET + readonly 403  
- Consent, DSAR export/erase gate, OAuth status  
- Insights, history turns, knowledge GET/paste  
- Webhook sink unsigned → 401/403  

### UI / journeys
- Catalogue filters, Learn more, Go-live 100, search  
- Studio knowledge → try → install; model picker; configure persist  
- Secondary + diligence pages (trust/privacy/terms/demo/install/ask/legal/cookies/DP/roadmap/history/insights/ops/my-agents)  
- Partner demo journey + acceptance bar  
- Go-live heroes: customer-support, dental-front-desk, home-services, hotel-guest, executive-assistant, it-helpdesk  
- Sandbox chat + UI card-refusal path  
- Mobile responsive home + studio try  

---

## Intentionally not automated (handover residual)

| Item | Why | Owner |
|---|---|---|
| Full 5–8 turn golden path per Go-live 18/100 | Live LLM cost + time | Product demo |
| Live connector proofs (Calendar/Slack/Shopify) | Needs customer credentials | Partner + eng |
| OIDC Bearer 401 matrix | Staging still mock rails | Cutover wave |
| Successful DSAR erase | Destructive on shared staging | Never on shared demo WS |
| SOC 2 / counsel-signed policies | Legal | Counsel |
| Full 500 SKU UI walkthrough | Low ROI | Catalogue integrity script instead |
| Continuous live-LLM quality program | Credits | `pnpm eval:live --limit=N` sampled |

---

## Sign-off

| Gate | Result | Date / by |
|---|---|---|
| `pnpm run ci` | ✅ | 2026-08-02 · Eng |
| `pnpm handover:staging` (78/78) | ✅ | 2026-08-02 · Eng · `feb6d43` |
| Human [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md) | ✅ B1–B10 eng-guided; product eyeball pending | 2026-08-02 |
| Ready to hand to MyInstantAI | ☐ Yes ☑ Yes with caveats ☐ No | |

**Caveats:**
- Mock rails still on for demos; OIDC/wallet cutover not done.
- Product owner should spot-check live Studio answer quality (B8 / C golden path) before partner call.
- Counsel-signed legal / SOC 2 remain open (unchanged).
