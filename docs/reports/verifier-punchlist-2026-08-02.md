# Verifier punch-list follow-up (2026-08-02)

Independent verifiers pinned to `2a40d34` reported **2 FIXED · 7 PARTIAL**. This note tracks in-repo closure of those PARTIAL residuals on later `main` (post Phase 3–5).

| Residual | Action taken |
|---|---|
| pg TLS off-by-default | **Closed** — verify by default; opt-out `PG_SSL_REJECT_UNAUTHORIZED=0` + `I_UNDERSTAND_PG_SSL_INSECURE=1` in prod |
| Shopify/Zendesk SSRF | **Closed** — `safeFetch` + `*.myshopify.com` / subdomain allowlists |
| safeFetch undici pin drop | **Closed** — fail closed if undici unavailable |
| Rate-limit Redis fail-open | **Mitigated** — when Redis is configured, errors fail closed (no Map fallback) |
| Durability optional | **Closed** — prod boot requires `DATABASE_URL` (dual file-fallback ACK escape) |
| Body size | **Closed** — middleware `Content-Length` cap + zod `.max()` on chat/rent schemas |
| CI eval / audit / secrets | **Tightened** — `staticHigh > 0` fails CI; critical audit blocking; gitleaks action |
| building-management grounding | **Closed** — Eval grounding aligned to 1-bed R1,450 / 2-bed R1,980; levy eval tightened |
| CSP `unsafe-inline` | **Still open** — App Router shell; nonce/`strict-dynamic` tracked separately |

Still external / ops: Redis provisioning for multi-replica, Railway volume attach, partner OIDC/wallet, Azure HA/KV.
