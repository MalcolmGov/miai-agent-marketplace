# P1 — Migration ops & observability

Completed after P0 so cutover week is runbook-driven, not ad hoc.

## Done

| Area | What shipped |
|---|---|
| Runbook | [MIGRATION_RUNBOOK.md](./MIGRATION_RUNBOOK.md) — deploy, smoke, cutover, rollback |
| Telemetry | [`apps/web/src/lib/telemetry.ts`](../apps/web/src/lib/telemetry.ts) — console JSON + App Insights custom events |
| Audit sink | `appendAudit` emits `miai.audit.<type>` (best-effort) |
| Health | `/api/health` reports `telemetry=appinsights\|console` |
| Azure | App Insights + KV secret mirrors + Container App MI → Key Vault Secrets User |
| Params | [`infra/azure/parameters.example.json`](../infra/azure/parameters.example.json) |

## Still blocked on MyInstantAI

- Real OIDC / wallet / model credentials  
- Azure subscription + who runs `az deployment`  
- Custom domain + OAuth redirect URI registration  

## P2 (later)

- Embed CSP / CORS for `myinstantai.com`  
- Load/smoke checklist automation on Azure staging  
- Switch Container App secrets to `keyVaultUrl` only  
