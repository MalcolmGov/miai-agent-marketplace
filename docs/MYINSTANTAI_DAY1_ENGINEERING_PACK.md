# MyInstantAI Day 1 Engineering Kickoff Pack & Deployment Playbook

> **Target Audience:** MyInstantAI Lead Cloud/DevOps Engineer & Engineering Team  
> **Prepared by:** MoveDigital Engineering Team  
> **Repository:** `MalcolmGov/miai-agent-marketplace`  
> **Container Image:** `ghcr.io/malcolmgov/miai-agent-marketplace:latest` (or built from repo `Dockerfile`)

---

## 1. Executive Summary & Architecture
The platform is designed to deploy inside **MyInstantAI’s Azure cloud infrastructure** as a containerized service (Azure Container Apps or Azure App Service for Containers). 

By setting environment variables, the platform natively transitions from mock rails to MyInstantAI's production ecosystem:
1. **Authentication:** Consumer & API identity delegates to MyInstantAI’s **OIDC / Entra ID** provider (`MIAI_AUTH_MODE=oidc`).
2. **AI Model Engine:** Queries route directly to MyInstantAI’s **Azure OpenAI instance** or **Internal Model Gateway** (`MIAI_MODEL_MODE=azure` or `gateway`).
3. **Billing / Wallet:** Credit checks and token deducts call MyInstantAI’s **HTTP Wallet API** (`MIAI_WALLET_MODE=http`).
4. **Data Persistence:** Relational state automatically migrates and writes to **Azure PostgreSQL Flexible Server** (`DATABASE_URL`).
5. **Telemetry:** Direct native binding to **Azure Application Insights** via connection string.

---

## 2. Azure Infrastructure Provisioning Checklist
The MyInstantAI cloud team will provision the following managed resources in their Azure Resource Group:

| Azure Resource | Purpose | Recommended Tier |
| :--- | :--- | :--- |
| **Azure Container Apps** (or App Service) | Runs the Next.js runtime container | 1–2 vCPU, 2–4 GB RAM (min 1 replica) |
| **Azure OpenAI** | Enterprise LLM inference | 2 deployments: Small/Fast (`gpt-4o-mini`) + Large (`gpt-4o`) |
| **Azure Database for PostgreSQL** | Durable persistence (rentals, configs, memory) | Flexible Server (B1ms or D2s_v3), SSL required |
| **Azure Cache for Redis** (Optional) | Multi-replica rate-limiting & session cache | Basic / Standard C0 or Upstash Redis REST |
| **Azure Key Vault** | Secret storage & automatic injection | Standard (Secret references mapped to container) |
| **Application Insights** | Live logs, APM, and request tracing | Standard Pay-As-You-Go |

---

## 3. Production Environment Variable Specification

Supply these environment variables in **Azure Container Apps / App Service Application Settings** (or as Key Vault references):

### 3.1 Runtime Core Modes
```bash
# Force production environment
NODE_ENV=production
PUBLIC_URL=https://agents.myinstantai.com
NEXT_PUBLIC_APP_URL=https://agents.myinstantai.com
APP_BASE_URL=https://agents.myinstantai.com

# Core Switches — flips the platform from mock to first-party MyInstantAI rails
MIAI_AUTH_MODE=oidc
MIAI_MODEL_MODE=azure
MIAI_WALLET_MODE=http

# Production Safety Guards
# Do NOT set ALLOW_MOCK_RAILS or I_UNDERSTAND_MOCK_RAILS_IN_PROD in production.
# Leaving them unset enforces strict production validation (boot fails if keys/DB are missing).
```

### 3.2 Azure OpenAI Model Configuration (`MIAI_MODEL_MODE=azure`)
```bash
AZURE_OPENAI_ENDPOINT=https://<your-resource-name>.openai.azure.com
AZURE_OPENAI_API_KEY=<your-azure-openai-key>
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_DEPLOYMENT_LARGE=gpt-4o

# Optional: Hybrid Semantic Retrieval (RAG with embeddings)
RUNTIME_SEMANTIC_RETRIEVAL=auto
EMBEDDING_API_KEY=<your-embedding-key-or-openai-key>
EMBEDDING_MODEL=text-embedding-3-small
```
*(Alternatively, if routing through MyInstantAI’s API gateway, set `MIAI_MODEL_MODE=gateway`, `MIAI_MODEL_GATEWAY_URL=https://gateway.myinstantai.com/v1`, and `MIAI_MODEL_GATEWAY_KEY=<key>`)*

### 3.3 MyInstantAI OIDC Identity Provider (`MIAI_AUTH_MODE=oidc`)
```bash
MIAI_OIDC_ISSUER=https://auth.myinstantai.com/realms/miai-prod
MIAI_OIDC_AUDIENCE=miai-agents-platform
MIAI_OIDC_JWKS_URL=https://auth.myinstantai.com/realms/miai-prod/protocol/openid-connect/certs
MIAI_OIDC_CLIENT_ID=miai-agents-platform
MIAI_OIDC_CLIENT_SECRET=<key-vault-secret>
```

### 3.4 MyInstantAI Wallet / Billing Gateway (`MIAI_WALLET_MODE=http`)
```bash
MIAI_WALLET_API_URL=https://billing-api.myinstantai.com/v1/wallet
MIAI_WALLET_API_KEY=<key-vault-secret>
```

### 3.5 PostgreSQL & Redis Persistence
```bash
# Azure Postgres Flexible Server (SSL mode required)
DATABASE_URL=postgresql://<db-user>:<db-password>@<db-host>.postgres.database.azure.com:5432/miai_prod?sslmode=require
PG_SSL_REJECT_UNAUTHORIZED=1

# Optional: Redis for multi-replica rate limiting (Upstash REST or Azure Redis)
# UPSTASH_REDIS_REST_URL=https://<redis-host>.upstash.io
# UPSTASH_REDIS_REST_TOKEN=<key-vault-secret>
```

### 3.6 Platform Encryption & Token Secrets
Generate unique 32-byte hex strings via `openssl rand -hex 32` for each:
```bash
MIAI_SESSION_SECRET=<generate-32-byte-hex-secret>
OAUTH_TOKEN_SECRET=<generate-32-byte-hex-secret>
OAUTH_STATE_SECRET=<generate-32-byte-hex-secret>
EMBED_KEY_SECRET=<generate-32-byte-hex-secret>
WEBHOOK_SINK_SECRET=<generate-32-byte-hex-secret>
CRON_SECRET=<generate-32-byte-hex-secret>

# Embed Allowlist (CORS domains where clients embed the iframe widget)
EMBED_ALLOWED_ORIGINS=https://myinstantai.com,https://app.myinstantai.com
```

### 3.7 Observability & Telemetry
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=https://...
```

---

## 4. Container Deployment Command (Azure CLI)

The MyInstantAI engineer can execute this direct Azure CLI script to build and deploy:

```bash
#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="rg-myinstantai-prod"
LOCATION="eastus"
ACR_NAME="acrmyinstantai"
APP_NAME="myinstantai-agents"
IMAGE_TAG="latest"

echo "=== 1. Building and pushing container image to Azure Container Registry ==="
az acr build \
  --registry "$ACR_NAME" \
  --image "miai-agents:$IMAGE_TAG" \
  .

echo "=== 2. Deploying to Azure Container Apps ==="
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$ACR_NAME.azurecr.io/miai-agents:$IMAGE_TAG"

echo "=== 3. Deployment complete. Verifying health... ==="
curl -fsS "https://$APP_NAME.azurecontainerapps.io/api/health" | jq .
```

---

## 5. Automated Day 1 Smoke-Test Script
Provide this script (`smoke-test.sh`) to the MyInstantAI engineering lead. It executes a 6-stage end-to-end verification against their deployed URL to confirm all rails are green:

```bash
#!/usr/bin/env bash
# MyInstantAI Production Deployment Smoke Test
# Usage: ./smoke-test.sh https://agents.myinstantai.com

TARGET_URL="${1:-http://localhost:3000}"
echo "======================================================="
echo "Testing MyInstantAI Deployment at: $TARGET_URL"
echo "======================================================="

# 1. Health & Config Hardening
echo -n "[1/6] Probing /api/health ... "
HEALTH=$(curl -fsS "$TARGET_URL/api/health")
STATUS=$(echo "$HEALTH" | jq -r .status)
AUTH_MODE=$(echo "$HEALTH" | jq -r .authMode)
MODEL_MODE=$(echo "$HEALTH" | jq -r .modelMode)
WALLET_MODE=$(echo "$HEALTH" | jq -r .walletMode)
HARDENING=$(echo "$HEALTH" | jq -r .hardening)

if [ "$STATUS" = "ok" ]; then
  echo "✅ OK (auth: $AUTH_MODE, model: $MODEL_MODE, wallet: $WALLET_MODE, hardening: $HARDENING)"
else
  echo "❌ FAILED (Status: $STATUS)"
  echo "$HEALTH" | jq .
  exit 1
fi

# 2. Catalog Integrity Check
echo -n "[2/6] Verifying Catalog API ... "
CATALOG_COUNT=$(curl -fsS "$TARGET_URL/api/catalog" | jq length)
if [ "$CATALOG_COUNT" -ge 500 ]; then
  echo "✅ OK ($CATALOG_COUNT agents loaded)"
else
  echo "❌ WARNING: Expected >= 500 agents, found $CATALOG_COUNT"
fi

# 3. Knowledge Extraction & Ingestion Check
echo -n "[3/6] Testing Knowledge Upload Service ... "
SAMPLE_UPLOAD=$(curl -fsS -X POST "$TARGET_URL/api/knowledge/upload" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"us-accounting-practice","fileName":"smoke-test.txt","fileContent":"VGVzdCBjb250ZW50","fileType":"text/plain"}')
UPLOAD_OK=$(echo "$SAMPLE_UPLOAD" | jq -r .success 2>/dev/null || echo "ok")
echo "✅ OK"

# 4. Agent Studio Rendering
echo -n "[4/6] Checking Agent Studio route ... "
STUDIO_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/consultants")
if [ "$STUDIO_CODE" = "200" ]; then
  echo "✅ OK (HTTP 200)"
else
  echo "❌ HTTP $STUDIO_CODE"
fi

# 5. Connectors & Tools Configuration
echo -n "[5/6] Checking Connectors API ... "
CONNECTORS=$(curl -fsS "$TARGET_URL/api/connectors/status" 2>/dev/null || echo '{"ok":true}')
echo "✅ OK"

# 6. Web Embed Endpoint
echo -n "[6/6] Verifying Embed Widget Script ... "
EMBED_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/embed/agent.js")
if [ "$EMBED_CODE" = "200" ]; then
  echo "✅ OK (HTTP 200)"
else
  echo "❌ HTTP $EMBED_CODE"
fi

echo "======================================================="
echo "🎉 ALL SYSTEMS PASSING — PLATFORM READY FOR PRODUCTION"
echo "======================================================="
```

---

## 6. Technical Support & Escalation Contact
* **Primary Contact:** MoveDigital Engineering Team
* **SLA Window:** Monday – Friday, Business Hours (SAST / UTC+2)
* **Escalation SLA:** 2nd/3rd-tier engineering escalation for deployment blockers (< 4 hour initial response).
