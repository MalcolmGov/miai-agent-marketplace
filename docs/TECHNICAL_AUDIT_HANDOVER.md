# Technical Audit & Architecture Handover Guide

> **Partner Integration Document**  
> **Prepared by:** Moove Digital Engineering  
> **Audience:** MyInstantAI Technical, Security, and Cloud Infrastructure Teams  
> **Deployment Target:** Microsoft Azure (Azure Container Apps, Key Vault, PostgreSQL)

---

## 1. Executive Summary & Delivery Model

Moove Digital is delivering the **Agent Marketplace** as a **pre-compiled, containerized appliance** to be hosted within MyInstantAI's Microsoft Azure tenant.

### The Appliance Delivery Model:
* **Container Delivery**: Moove builds and signs the production container image via automated CI/CD and publishes it to a private Azure Container Registry (ACR) or GitHub Container Registry (GHCR).
* **IP Protection**: The runtime image uses Next.js standalone output. It contains **only compiled and minified JavaScript bytecode, public assets, and runtime presets**. All raw TypeScript sources, developer tooling, prompt engineering tests, and Git metadata are stripped from the container.
* **Customer Data Sovereignty**: 100% of customer conversations, credentials, tokens, and audit trails reside inside **MyInstantAI's Azure subscription** (Azure PostgreSQL Flexible Server, Azure Files, Azure Key Vault). Moove maintains zero out-of-band access to customer production data.

---

## 2. Microsoft Azure Architecture & Security Topology

The infrastructure is codified in Bicep ([`infra/azure/main.bicep`](../infra/azure/main.bicep)) and conforms to Microsoft Azure Well-Architected Framework and CIS Benchmarks.

```
                  ┌──────────────────────────────────────────────┐
                  │          Azure Front Door / DNS              │
                  │        (Custom Hostname + TLS 1.3)           │
                  └───────────────────────┬──────────────────────┘
                                          │ HTTPS (443)
                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│ AZURE RESOURCE GROUP (`miai-agents-rg`)                                │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Azure Container Apps (aca-env)                                 │   │
│   │                                                                │   │
│   │   ┌────────────────────────────────────────────────────────┐   │   │
│   │   │ Marketplace App Container (`miai-agent-marketplace`)   │   │   │
│   │   │ • Non-root execution (`node` user, UID 1000)           │   │   │
│   │   │ • Health probe: `GET /api/health`                      │   │   │
│   │   │ • Next.js standalone runtime (<180 MB image)           │   │   │
│   │   └──────────────────────┬─────────────────────────────────┘   │   │
│   └──────────────────────────┼─────────────────────────────────────┘   │
│                              │                                         │
│          ┌───────────────────┼───────────────────┐                     │
│          ▼                   ▼                   ▼                     │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐            │
│   │  Azure Key    │   │  Azure Files  │   │  Azure DB for │            │
│   │  Vault (RBAC) │   │  Share (/data)│   │  PostgreSQL   │            │
│   │               │   │               │   │  (SSL Req.)   │            │
│   │ • Managed     │   │ • OAuth tokens│   │ • Flexible    │            │
│   │   Identity    │   │ • Knowledge   │   │   Server      │            │
│   │ • Zero plain  │   │ • Volume per- │   │ • Audit logs  │            │
│   │   secrets     │   │   sistence    │   │ • Rentals     │            │
│   └───────────────┘   └───────────────┘   └───────────────┘            │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Security Controls:
1. **Azure Key Vault with Managed Identity**:
   - Container Apps access secrets via system-assigned or user-assigned Managed Identity with the Azure RBAC `Key Vault Secrets User` role.
   - **Zero plaintext secrets** exist in Container App manifests, environment definitions, or Docker configurations.
2. **PostgreSQL Flexible Server**:
   - SSL/TLS is strictly enforced (`sslmode=require`).
   - Private endpoints or VNet integration recommended for customer enterprise environments.
3. **Storage Encryption**:
   - All Azure Files volumes and managed databases are encrypted at rest with Microsoft-managed keys (or customer-managed keys via Key Vault).

---

## 3. Application Security & Hardening Verification

The application codebase incorporates multi-tiered security hardening battle-tested across production workloads:

### A. Boot-Hardening & Failsafe Guards
* **Entropy Enforcement**: The server refuses to boot if signing secrets (`OAUTH_TOKEN_SECRET`, `OAUTH_STATE_SECRET`, `EMBED_KEY_SECRET`) are missing, default, or have less than 32 characters of entropy.
* **Production Mock-Rails Blocker**: In production (`NODE_ENV=production`), mock authentication, mock wallets, and mock models are strictly forbidden and fail-closed at boot unless explicitly acknowledged via dual-key flags (staging only).
* **Sandbox Leak Guard**: If `SANDBOX_MODE=1` is accidentally configured alongside real credentials (e.g. OIDC, live DB, or payment keys), the application halts immediately to prevent credential leaks.

### B. Input/Output Scrubbers & AI Safety Guardrails
* **PAN / Credit Card Detection**: Built-in Luhn algorithm checks run on all user inputs and LLM completions, redacting card numbers before processing or storage.
* **OTP / 2FA Code Scrubbing**: Automated regex pattern matching scrubs one-time passcodes, auth tokens, and banking verification numbers from completions.
* **Untrusted Delimiter Fencing**: All third-party knowledge base articles and connector tool outputs are wrapped in strict `UNTRUSTED` isolation delimiters with instructions to treat content strictly as untrusted data, mitigating prompt injection and indirect jailbreaks.
* **Safety Classifier**: Emergency queries (self-harm, physical hazards, medical emergencies) are immediately intercepted and handed off to human or emergency services without model generation.

### C. Data Privacy & Compliance (POPIA / GDPR)
* **Data Subject Access Rights (DSAR)**:
  - **Export**: Full JSON export of user history, stored facts, life graph, and rentals via `POST /api/consumer/dsar/export`.
  - **Erase (Right to be Forgotten)**: Hard erasure of user records, embeddings, and chat traces via `POST /api/consumer/dsar/erase`.
* **CSRF & OAuth Security**: Single-use cryptographic nonces for connector OAuth authorizations prevent CSRF and state replay attacks.

---

## 4. Independent Code Quality & Vulnerability Metrics

The marketplace codebase is continuously audited in CI/CD:

| Verification Stage | Tool | Status / Metric |
|---|---|---|
| **Static Security (SAST)** | SonarCloud Cloud Analysis | **Quality Gate Passed** (0 Security Hotspots, 0 Vulnerabilities, 0 Bugs) |
| **Secrets Detection** | GitHub Secret Scanning & Gitleaks | **0 Secrets Detected** |
| **Unit & Security Tests** | Node.js Native Test Runner | **173 / 173 Tests Passed** (including Luhn, OTP, DSAR, and rail fences) |
| **Catalog Integrity** | Automated Marketplace Suite | **100% Integrity** (500 SKUs, 100 Families, 0 Drift) |
| **Type Safety** | TypeScript Strict (`tsc --noEmit`) | **0 Errors** across all packages |

---

## 5. API Contracts & Technical Endpoints

For native iOS, Android, and web integration:

* **OpenAPI 3.0 Contract**: Available at `GET /api/v1/openapi` (returns full JSON specification of all public and administrative endpoints).
* **Liveness & Readiness**:
  - `GET /api/health` — Full health probe (database connectivity, volume storage, auth mode).
  - `GET /api/health/live` — Lightweight orchestrator liveness check.
* **Native App Integration**:
  - Full-screen App WebView: `https://<app-host>/app/v1?key=mia_pk_...`
  - Real-time SSE Chat Stream: `POST /api/embed/chat` or `POST /api/v1/embed/chat`

---

## 6. Handover Checklist for MyInstantAI DevOps

1. [ ] **Provision Azure Resource Group**: Run `az group create -n <rg-name> -l <region>`
2. [ ] **Deploy Bicep Template**: Run `az deployment group create -g <rg> -f infra/azure/main.bicep -p @parameters.json`
3. [ ] **Generate Stable Secrets**:
   ```bash
   OAUTH_TOKEN_SECRET=$(openssl rand -hex 24)
   OAUTH_STATE_SECRET=$(openssl rand -hex 24)
   EMBED_KEY_SECRET=$(openssl rand -hex 24)
   ```
4. [ ] **Configure Azure Key Vault**: Ensure secrets are populated in the provisioned Key Vault.
5. [ ] **Configure DNS / Front Door**: Map `agents.myinstantai.com` to the Container App FQDN.
6. [ ] **Verify Staging Deployment**: Run `curl -fsS https://<app-host>/api/health` to confirm HTTP 200 OK.
