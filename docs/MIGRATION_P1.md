# P1 — Migration ops & observability

Completed after P0 so cutover week is runbook-driven, not ad hoc.

## Done

| Area | What shipped |
|---|---|
| Runbook | [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) — deploy, smoke, cutover, rollback |
| Telemetry | [`apps/web/src/lib/telemetry.ts`](../apps/web/src/lib/telemetry.ts) — console JSON + App Insights custom events |
| Audit sink | `appendAudit` emits `miai.audit.<type>` (best-effort) |
| Health | `/api/health` — store ping + hydrate + config completeness flags |
| Smoke | `pnpm smoke:cutover` (`scripts/cutover-smoke.mjs`) |
| Azure | App Insights + KV secret mirrors + Azure Files `/data` + Postgres AllowAzureServices + OIDC/embed secrets |
| Validate | `pnpm validate:azure` (`scripts/validate-azure.sh`) |
| Params | [`infra/azure/parameters.example.json`](../infra/azure/parameters.example.json) |
| Wallet | HttpWallet 402/409 → `{ ok:false, paused:true }`; `pnpm test:wallet` |
| Embed CORS | `EMBED_ALLOWED_ORIGINS` allowlist (`*` default) |

## Still blocked on MyInstantAI

- Real OIDC / wallet / model credentials  
- Azure subscription + who runs `az deployment`  
- Custom domain + OAuth redirect URI registration  
- Native app owner + deep-link / App channel pilot slot (see [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) Phases 2–3)

## P2 (later)

- Persist OAuth/knowledge in Postgres (Files share is cutover-safe interim)  
- Optional native messenger on `POST /api/app/chat` (SSE) instead of WebView  
- Load test + production App URL monitoring  

## Polish completed (post-P1)

| Area | Status |
|---|---|
| KV-only CA secrets | UAMI + `keyVaultUrl` in `main.bicep` |
| App Insights depth | `trackException` / `trackDependency` + chat/oauth hooks |
| Workflow reply language | `wf()` + `replyLanguage` through runTurn / embed |
| Studio UI i18n | create / request / studio / knowledge / actions |
| Catalogue eval contract | `pnpm eval:suite` runs the **MOCK** runtime — a package-integrity / self-consistency check (~95%), **not** model quality. Real-model evals are `tools/run_evals.py` in the `miai-agents` repo. |
