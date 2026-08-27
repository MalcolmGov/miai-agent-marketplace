# Information Request — MyInstantAI Technical Team
### Production cutover (P0-5) · MyInstantAI Agent Marketplace × Moove Digital
**Date:** 2026-08-26 · **Prepared by:** Moove Digital

---

## Purpose

To boot the marketplace on hardened production, we need a set of values and confirmations that sit on **MyInstantAI's side** of the build — the Azure subscription, identity, billing gateway, model access, Key Vault and DNS. The application itself is **built and verified**; this is a **configuration handoff, not development**.

The app **fails closed at boot** if production config is incomplete, so every item below maps to a specific environment variable the code reads. Once wired, `GET /api/health` confirms a correct boot (see *Acceptance* at the end).

## How to respond

- Fill the **"Your response"** column, or mark **⏳ pending** / **✅ ready**.
- ⚠️ **Do not paste live secrets into this document.** Load secret values (client secrets, API keys, connection strings) **directly into the deployment's Azure Key Vault** and mark the row *"loaded → `<secret-name>`"*, or share via an agreed secure channel. Non-secret values (URLs, issuer, deployment names, regions) can be filled in here directly.
- References already in the repo: full env map → `docs/AZURE_DEPLOYMENT.md`; the go/no-go this feeds → `docs/CUTOVER_CHECKLIST.md`.

## Ownership at a glance
*(from `docs/MIGRATION_RUNBOOK.md` / `docs/B2B_ONBOARDING.md`)*

| MyInstantAI owns | Moove Digital owns |
|---|---|
| Azure subscription/RG, DNS/Front Door, OIDC identity + workspace minting, wallet/billing gateway, model keys, Key Vault, native app release | The marketplace app, onboarding UX, catalogue, verification — **✅ complete** |

---

## 0 · Decisions to confirm first
*These four determine several rows below, so please settle them up front.*

| # | Decision | Options | Your choice |
|---|----------|---------|-------------|
| D1 | **Model path** | Azure OpenAI direct (`azure`) · or MyInstantAI model gateway (`gateway`) | |
| D2 | **Consumer identity** | MyInstantAI OIDC issuer · or Google as the IdP | |
| D3 | **Azure subscription** hosting it + how **tenants map to partners** | | |
| D4 | **Region / data residency** (per market — Postgres + model co-located) | | |

---

## 1 · Identity / OIDC
*You own identity + workspace minting → `MIAI_AUTH_MODE=oidc`*

| Item | Env var | What we need | Your response |
|------|---------|--------------|---------------|
| Issuer | `MIAI_OIDC_ISSUER` | OIDC issuer URL | |
| Client | `MIAI_OIDC_CLIENT_ID` / `MIAI_OIDC_CLIENT_SECRET` | app registration (secret → Key Vault) | |
| Token validation | `MIAI_OIDC_AUDIENCE` / `MIAI_OIDC_JWKS_URL` | audience + JWKS URL | |
| **Sample token** | — | a **sample JWT containing `workspace_id`** so we can verify the token → tenant mapping against staging | |
| Redirect URIs | — | confirm you'll register our prod callback URL(s) — we supply the exact URLs once the FQDN is set (§4) | |

## 2 · Wallet / billing gateway  ⚠️ *critical path*
*The P0-4 decision — real billing runs through your gateway, not Paystack → `MIAI_WALLET_MODE=http`*

| Item | Env var | What we need | Your response |
|------|---------|--------------|---------------|
| Gateway URL | `MIAI_WALLET_API_URL` | base URL | |
| Auth | `MIAI_WALLET_API_KEY` | API key (→ Key Vault) | |
| API contract | — | debit + credit + balance/ledger-read endpoints, with request/response shapes | |
| Idempotency | — | how idempotency keys are honoured (we send one per turn) | |
| **Liveness** | — | ✅ confirm the gateway is **live, durable, and idempotent** in production | |

> **This is the single hardest dependency.** Everything else is a value we wire in; this one is a build-status confirmation on your side, and the cutover checklist treats "gateway not yet durable" as an **immediate NO-GO**.

## 3 · Model access
*Per Decision **D1***

**If Azure OpenAI (`MIAI_MODEL_MODE=azure`):**

| Item | Env var | What we need | Your response |
|------|---------|--------------|---------------|
| Endpoint | `AZURE_OPENAI_ENDPOINT` | endpoint URL | |
| Key | `AZURE_OPENAI_API_KEY` | key (→ Key Vault) | |
| Deployments | — | **two** deployment names: a **large** (gpt-4o-class) + a **small/cheap** one (we map model tiers to them) | |
| Region | — | Azure region (per D4) | |

**If your model gateway (`MIAI_MODEL_MODE=gateway`):**

| Item | Env var | What we need | Your response |
|------|---------|--------------|---------------|
| Gateway | `MIAI_MODEL_GATEWAY_URL` / `MIAI_MODEL_GATEWAY_KEY` | URL + key (→ Key Vault) | |

## 4 · Infrastructure (your Azure subscription)

| Item | Env var | What we need | Your response |
|------|---------|--------------|---------------|
| Database | `DATABASE_URL` | Azure Postgres connection string, SSL required (→ Key Vault) | |
| Redis | `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Redis URL + token (or Azure Cache) — required once >1 replica for shared rate-limits | |
| **FQDN / domain** | `APP_URL` | the production hostname + TLS (DNS/Front Door) — **also needed for OIDC + connector redirect URIs** | |
| Key Vault | — | confirm the Vault exists and the Container App can reference secrets from it | |

## 5 · Connectors
*Optional per end-customer, but needed for any you want live at launch*

| Item | What we need | Your response |
|------|--------------|---------------|
| In-scope list | which connectors go live at launch (Slack, Google Calendar/Gmail, HubSpot, M365, Shopify, …) | |
| OAuth apps + branding | whose OAuth apps back them (consent-screen branding). If MyInstantAI's → client ID/secret per connector (→ Key Vault) | |
| Redirect URIs | we provide the exact callback URLs to register once the FQDN (§4) is set | |
| Staging test creds | so your team can exercise the **live** connector path on staging before cutover | |

> Note: `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` is **dual-use** — it powers both Google sign-in and the Google Calendar/Gmail connectors.

## 6 · Release & ops

| Item | What we need | Your response |
|------|--------------|---------------|
| Azure / pipeline access | who runs `az deployment` / holds the reviewer role on the release | |
| Native app | WebView / deep-link (or native chat client) release plan + timing | |

---

## Acceptance — what "green" looks like

Once the above are wired, `GET /api/health` on the production host must return:

```json
{ "status": "ok", "hardening": "ok", "mockRailsAllowed": false, "sandboxMode": false,
  "authMode": "oidc", "walletMode": "http", "modelMode": "azure", "storeBackend": "postgres" }
```

Then the authenticated cutover smoke + **one real OIDC login** + **one real wallet debit** prove reachability (health confirms presence, not liveness). Full go/no-go: `docs/CUTOVER_CHECKLIST.md`.

## What Moove Digital provides in return

So the handoff is two-sided, on our side we supply:
- The container image (pinned SHA) + the complete env map (`docs/AZURE_DEPLOYMENT.md`).
- Strong random values for the **app-level** secrets (`OAUTH_TOKEN_SECRET`, `MIAI_SESSION_SECRET`, `WEBHOOK_SINK_SECRET`, `CRON_SECRET`, …) for you to load into Key Vault.
- The exact prod redirect URIs to register (OIDC + connectors) once the FQDN is set.
- Boot-hardening preflight + cutover smoke verification on the day.

---
*Moove Digital · MyInstantAI Agent Marketplace production cutover · respond per section above.*
