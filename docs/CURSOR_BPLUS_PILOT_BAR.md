# Cursor task — B+ pilot bar (target diligence **78–80**)

**Owner:** Cursor (eng) + Malcolm (ops on Railway)  
**Baseline score:** **B · 72** — `docs/reports/technical-audit-update-2026-08-02.md`  
**Goal:** close the **highest-ROI** residuals that move pilot credibility without waiting on counsel or SOC 2.

## Are SOC 2 / certs mandatory?

**No — not for early pilots / staging demos / most SMB customers.**

| Item | Mandatory now? | When it becomes expected |
|---|---|---|
| SOC 2 / ISO 27001 | **No** | Enterprise RFP, banks, large SaaS procurement |
| Counsel-signed DPA/BAA/privacy | **No** for demos | Before processing real customer PII at scale / HIPAA packs |
| Azure HA / Key Vault | **No** | Multi-region enterprise cutover |
| Semantic embeddings | **No** | Quality differentiation / large knowledge bases |
| Redis + Postgres TLS CA | **Recommended for B+** | Before multi-replica or serious pilot SLAs |

Keep compliance docs labeled **DRAFT**. Do not block the B+ track on SOC 2.

---

## Guardrails
- Never delete unprefixed ZA packs.
- Do not re-deepen Cluster B.
- MockModel % ≠ live quality.
- Keep `pnpm run ci` green.

---

## P0 — ops (you on Railway; Cursor makes them measurable)

### 1. Provision Upstash Redis — **DONE** (2026-08-02)
- Staging health: `redisConfigured: true`, `redisPing: "ok"`, `redisBackend: "upstash-rest"`.

### 2. Prefer verifiable Postgres TLS — **RESIDUAL (intentional)**
- Removing `PG_SSL_REJECT_UNAUTHORIZED=0` + `I_UNDERSTAND_PG_SSL_INSECURE=1` broke healthcheck on Railway Postgres (no trusted CA in the app image).
- **Keep dual-ACK** until a verifiable CA is mounted. Not a silent fail-open — both flags required.

---

## P1 — eng (in-repo)

### 3. Health surfaces Redis
- **Done in this track:** `/api/health` reports `redisConfigured` / `redisPing` / `redisBackend`. Configured-but-broken Redis → degraded/503.

### 4. Nightly live-eval sample (non-blocking)
- Wire `pnpm eval:live` into `.github/workflows/eval-nightly.yml` (continue-on-error, secret-gated).
- **Accept:** workflow runs when `ANTHROPIC_API_KEY` is set; writes/logs a live sample; **does not** fail the mock nightly gate.

### 5. CSP `style-src` without `unsafe-inline`
- **Defer unless clean.** next/font + Tailwind usually need inline styles.
- **Accept if deferred:** document in this file + audit update; script-src nonce remains the security win.

### 6. Optional: turn on `WEBHOOK_SINK_HMAC_ONLY=1` on staging — **DONE** (2026-08-02)
- Staging set `WEBHOOK_SINK_HMAC_ONLY=1`; legacy raw-secret signatures rejected.

---

## Out of scope for 78–80
- SOC 2 evidence collection / auditor
- Counsel legal finalization
- Semantic retrieval / embeddings
- Azure production cutover
- Partner OIDC + real wallet (parallel track)

---

## Done when
- [x] Staging health shows Redis ping ok
- [x] PG insecure dual-ACK documented as Railway plan limitation (kept on)
- [x] Nightly live-eval job exists (secret-gated, non-blocking)
- [x] `WEBHOOK_SINK_HMAC_ONLY=1` on staging
- [ ] Audit update notes B+ track progress (score refresh)
- [x] Diligence narrative can claim **pilot B+ path** without claiming enterprise certification

**Ops bar for ~78–80:** essentially closed. Remaining score lift is narrative refresh + optional nightly `ANTHROPIC_API_KEY` in GitHub secrets.
