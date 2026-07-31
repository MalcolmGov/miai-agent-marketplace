# Azure infrastructure

Bicep landing zone for the Agent Marketplace.

## Resources

- Container Apps environment + web app (system-assigned MI)
- PostgreSQL Flexible Server + `miai_agents` database
- Key Vault (RBAC) with mirrored secrets + **Secrets User** for the app MI
- Log Analytics + Application Insights

## Deploy

See [MIGRATION_RUNBOOK.md](../../docs/MIGRATION_RUNBOOK.md).

```bash
az deployment group create \
  -g <rg> \
  -f main.bicep \
  -p @parameters.example.json
```

## Secrets

First deploy injects CA secrets as values (reliable boot) and **also** stores them in Key Vault.  
After the MI role assignment propagates, switch CA secret definitions to `keyVaultUrl` if your security review requires KV-only refs.
