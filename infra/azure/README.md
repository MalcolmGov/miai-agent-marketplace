# Azure infrastructure

Bicep landing zone for the Agent Marketplace.

## Resources

- Container Apps environment + web app (system-assigned MI)
- PostgreSQL Flexible Server + `miai_agents` database + Allow Azure Services firewall
- Azure Files share mounted at `/data` (OAuth tokens, knowledge, rental file fallback)
- Key Vault (RBAC) with mirrored secrets + **Secrets User** for the app MI
- Log Analytics + Application Insights

## Validate (no subscription deploy)

```bash
# From repo root — requires Azure CLI + bicep
./scripts/validate-azure.sh
```

## Deploy

See [MIGRATION_RUNBOOK.md](../../docs/MIGRATION_RUNBOOK.md).

```bash
az deployment group create \
  -g <rg> \
  -f main.bicep \
  -p @parameters.example.json
```

## Secrets

Secrets are written to Key Vault and referenced by the Container App via `keyVaultUrl` + user-assigned managed identity (no plaintext secret values on the CA resource).

## Persistence

| Data | Store |
|---|---|
| Rentals / audit | Azure Postgres (`DATABASE_URL`) |
| OAuth tokens | `/data/oauth-tokens.json` on Azure Files |
| Knowledge sources | `/data/knowledge-sources.json` on Azure Files |
| Rental file fallback | `/data/rentals.json` (used only if Postgres unavailable) |
