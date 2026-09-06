// Azure landing zone for Agent Marketplace
// Container Apps + Postgres + Key Vault + Azure Files + Log Analytics + App Insights
targetScope = 'resourceGroup'

@description('Azure region')
param location string = resourceGroup().location

@description('Name prefix for resources')
@minLength(3)
param namePrefix string = 'miai-agents'

@description('Container image (ACR or public)')
param containerImage string = 'ghcr.io/example/miai-agent-marketplace:latest'

@description('Public app hostname (for APP_BASE_URL)')
param appHost string = 'agents.example.com'

@secure()
param postgresAdminPassword string

@description('MyInstantAI OIDC issuer URL')
param oidcIssuer string = ''

@description('Optional OIDC audience')
param oidcAudience string = 'miai-agents'

@description('Optional JWKS URL override (defaults to issuer discovery)')
param oidcJwksUrl string = ''

@description('MyInstantAI wallet API base URL')
param walletApiUrl string = ''

@secure()
param walletApiKey string = ''

@description('MyInstantAI model gateway URL')
param modelGatewayUrl string = ''

@secure()
param modelGatewayKey string = ''

@description('Comma-separated origins allowed for embed chat CORS (* = allow all)')
param embedAllowedOrigins string = '*'

@description('Max Container App replicas. Keep at 1 until Redis (Upstash REST or Azure Cache) is provisioned and the UPSTASH_* env is set — chat sessions and rate limits are per-replica otherwise (see apps/web/.env.example). Scaling past 1 without shared state breaks mid-conversation continuity.')
@minValue(1)
param maxReplicas int = 1

// Signing secrets are REQUIRED and must be stable across deploys. They are not
// auto-generated: uniqueString() output is only 13 chars (below the app's 16-char
// boot-hardening floor, so the container crash-loops under OIDC) and is deterministic
// from the resource-group id, which would make embed publishable keys forgeable.
// Generate once with e.g. `openssl rand -hex 24` and reuse the SAME values every deploy.
@secure()
@minLength(32)
@description('OAuth token signing secret — stable random value, >=32 chars (e.g. `openssl rand -hex 24`). Reuse the same value across deploys; changing it invalidates existing embed keys and sessions.')
param oauthTokenSecretParam string

@secure()
@minLength(32)
@description('OAuth state signing secret — stable random value, >=32 chars (e.g. `openssl rand -hex 24`).')
param oauthStateSecretParam string

@secure()
@minLength(32)
@description('Embed key HMAC secret — stable random value, >=32 chars. Changing it invalidates every tenant embed key.')
param embedKeySecretParam string

// --- Connector credentials (OAuth clients, WhatsApp, Stripe, webhook/MCP sinks) ---
// Supplied by MyInstantAI at deploy. Any left empty are simply not wired (that connector's
// "Connect" flow stays unavailable) rather than failing the deploy — see the filter() below.
// Client IDs are public OAuth identifiers (plain env); client secrets and tokens go to Key Vault.
@description('Google OAuth client id')
param googleOauthClientId string = ''
@secure()
param googleOauthClientSecret string = ''
@description('Microsoft OAuth client id')
param microsoftOauthClientId string = ''
@secure()
param microsoftOauthClientSecret string = ''
@description('Slack OAuth client id')
param slackOauthClientId string = ''
@secure()
param slackOauthClientSecret string = ''
@description('Slack default channel id (optional)')
param slackDefaultChannel string = ''
@description('Shopify OAuth client id')
param shopifyOauthClientId string = ''
@secure()
param shopifyOauthClientSecret string = ''
@description('HubSpot OAuth client id')
param hubspotOauthClientId string = ''
@secure()
param hubspotOauthClientSecret string = ''
@description('Xero OAuth client id')
param xeroOauthClientId string = ''
@secure()
param xeroOauthClientSecret string = ''
@description('QuickBooks OAuth client id')
param quickbooksOauthClientId string = ''
@secure()
param quickbooksOauthClientSecret string = ''
@description('QuickBooks environment (sandbox|production)')
param quickbooksEnv string = 'sandbox'
@description('Calendly OAuth client id')
param calendlyOauthClientId string = ''
@secure()
param calendlyOauthClientSecret string = ''
@description('Zendesk OAuth client id')
param zendeskOauthClientId string = ''
@secure()
param zendeskOauthClientSecret string = ''
@secure()
@description('WhatsApp Cloud API token')
param whatsappToken string = ''
@description('WhatsApp phone number id')
param whatsappPhoneNumberId string = ''
@secure()
@description('Stripe secret key (tenant payment-link tools)')
param stripeSecretKey string = ''
@secure()
@description('Shared secret for the webhook sink (WEBHOOK_SINK_SECRET)')
param webhookSinkSecret string = ''
@secure()
@description('Bearer token for the MCP sink (MCP_SINK_TOKEN)')
param mcpSinkToken string = ''

@secure()
@description('Telegram Bot API token for the consumer chatbot (from @BotFather)')
param telegramBotToken string = ''
@secure()
@description('Optional Telegram webhook secret (set with setWebhook?secret_token=…)')
param telegramBotSecret string = ''

// --- Private image registry (for pulling the container image) ---
// Empty registryServer = the image is public (no credentials needed). For a private GHCR or
// ACR image, set all three so the Container App can authenticate the pull.
@description('Registry server for a private image pull, e.g. ghcr.io or myacr.azurecr.io. Empty = public image.')
param registryServer string = ''
@description('Registry username (GitHub username for GHCR, or ACR token/username).')
param registryUsername string = ''
@secure()
@description('Registry password/token (GHCR PAT with read:packages, or ACR password).')
param registryPassword string = ''

var kvName = take('${namePrefix}-kv', 24)
var pgName = take('${namePrefix}-pg', 60)
var caName = take('${namePrefix}-web', 32)
var storageName = take(toLower(replace('${namePrefix}st', '-', '')), 24)
var uamiName = take('${namePrefix}-uami', 128)
var oauthTokenSecret = oauthTokenSecretParam
var oauthStateSecret = oauthStateSecretParam
var embedKeySecret = embedKeySecretParam

// Connector secrets → Key Vault + a secretRef env. Empty ones are filtered out so no empty
// KV secret is created (Key Vault rejects empty values) and no dangling secretRef is left.
var connectorSecretDefs = [
  { kv: 'google-oauth-client-secret', env: 'GOOGLE_OAUTH_CLIENT_SECRET', value: googleOauthClientSecret }
  { kv: 'microsoft-oauth-client-secret', env: 'MICROSOFT_OAUTH_CLIENT_SECRET', value: microsoftOauthClientSecret }
  { kv: 'slack-oauth-client-secret', env: 'SLACK_OAUTH_CLIENT_SECRET', value: slackOauthClientSecret }
  { kv: 'shopify-oauth-client-secret', env: 'SHOPIFY_OAUTH_CLIENT_SECRET', value: shopifyOauthClientSecret }
  { kv: 'hubspot-oauth-client-secret', env: 'HUBSPOT_OAUTH_CLIENT_SECRET', value: hubspotOauthClientSecret }
  { kv: 'xero-oauth-client-secret', env: 'XERO_OAUTH_CLIENT_SECRET', value: xeroOauthClientSecret }
  { kv: 'quickbooks-oauth-client-secret', env: 'QUICKBOOKS_OAUTH_CLIENT_SECRET', value: quickbooksOauthClientSecret }
  { kv: 'calendly-oauth-client-secret', env: 'CALENDLY_OAUTH_CLIENT_SECRET', value: calendlyOauthClientSecret }
  { kv: 'zendesk-oauth-client-secret', env: 'ZENDESK_OAUTH_CLIENT_SECRET', value: zendeskOauthClientSecret }
  { kv: 'whatsapp-token', env: 'WHATSAPP_TOKEN', value: whatsappToken }
  { kv: 'stripe-secret-key', env: 'STRIPE_SECRET_KEY', value: stripeSecretKey }
  { kv: 'webhook-sink-secret', env: 'WEBHOOK_SINK_SECRET', value: webhookSinkSecret }
  { kv: 'mcp-sink-token', env: 'MCP_SINK_TOKEN', value: mcpSinkToken }
  { kv: 'telegram-bot-token', env: 'TELEGRAM_BOT_TOKEN', value: telegramBotToken }
  { kv: 'telegram-bot-secret', env: 'TELEGRAM_BOT_SECRET', value: telegramBotSecret }
]
var activeConnectorSecrets = filter(connectorSecretDefs, s => !empty(s.value))

// Non-secret connector config (public OAuth client ids + a couple of plain settings).
var connectorPlainEnvAll = [
  { name: 'GOOGLE_OAUTH_CLIENT_ID', value: googleOauthClientId }
  { name: 'MICROSOFT_OAUTH_CLIENT_ID', value: microsoftOauthClientId }
  { name: 'SLACK_OAUTH_CLIENT_ID', value: slackOauthClientId }
  { name: 'SLACK_DEFAULT_CHANNEL', value: slackDefaultChannel }
  { name: 'SHOPIFY_OAUTH_CLIENT_ID', value: shopifyOauthClientId }
  { name: 'HUBSPOT_OAUTH_CLIENT_ID', value: hubspotOauthClientId }
  { name: 'XERO_OAUTH_CLIENT_ID', value: xeroOauthClientId }
  { name: 'QUICKBOOKS_OAUTH_CLIENT_ID', value: quickbooksOauthClientId }
  { name: 'QUICKBOOKS_ENV', value: quickbooksEnv }
  { name: 'CALENDLY_OAUTH_CLIENT_ID', value: calendlyOauthClientId }
  { name: 'ZENDESK_OAUTH_CLIENT_ID', value: zendeskOauthClientId }
  { name: 'WHATSAPP_PHONE_NUMBER_ID', value: whatsappPhoneNumberId }
]
var connectorPlainEnv = filter(connectorPlainEnvAll, e => !empty(e.value))

// Deterministic vault URI (a variable for-body cannot read the runtime kv.properties.vaultUri).
// Same value kv.properties.vaultUri resolves to: https://<name>.vault.azure.net/
var kvUri = 'https://${kvName}${environment().suffixes.keyvaultDns}/'
// Precomputed here because a for-expression cannot be nested inside concat() in a property.
var connectorSecretRefs = [
  for s in activeConnectorSecrets: {
    name: s.kv
    keyVaultUrl: '${kvUri}secrets/${s.kv}'
    identity: uami.id
  }
]
var connectorSecretEnv = [
  for s in activeConnectorSecrets: {
    name: s.env
    secretRef: s.kv
  }
]

// Private-registry pull config (inline Container App secret, so it is available before the app
// can read Key Vault). Empty when no registryServer/registryPassword is supplied.
var registries = empty(registryServer) ? [] : [
  {
    server: registryServer
    username: registryUsername
    passwordSecretRef: 'registry-password'
  }
]
var registryConfigSecrets = empty(registryPassword) ? [] : [
  {
    name: 'registry-password'
    value: registryPassword
  }
]

// Built-in: Key Vault Secrets User
var roleKeyVaultSecretsUser = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

// User-assigned MI created before the Container App so KV secret refs work on first deploy
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: uamiName
  location: location
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

resource kvSecretOauth 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'oauth-token-secret'
  properties: { value: oauthTokenSecret }
}

resource kvSecretOauthState 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'oauth-state-secret'
  properties: { value: oauthStateSecret }
}

resource kvSecretEmbed 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'embed-key-secret'
  properties: { value: embedKeySecret }
}

resource kvSecretWallet 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'wallet-api-key'
  properties: { value: walletApiKey }
}

resource kvSecretModel 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'model-gateway-key'
  properties: { value: modelGatewayKey }
}

// One Key Vault secret per supplied connector credential (empty ones already filtered out).
resource kvConnectorSecrets 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = [
  for s in activeConnectorSecrets: {
    parent: kv
    name: s.kv
    properties: { value: s.value }
  }
]

resource kvSecretDb 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'database-url'
  properties: {
    value: 'postgresql://miaiadmin:${uriComponent(postgresAdminPassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/miai_agents?sslmode=verify-full'
  }
}

// UAMI can read KV secrets before the Container App boots (avoids circular SystemAssigned dependency)
resource kvRoleUami 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, uami.id, 'kv-secrets-user')
  scope: kv
  properties: {
    roleDefinitionId: roleKeyVaultSecretsUser
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource log 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' } }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: log.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-01-01' = {
  parent: storage
  name: 'default'
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  parent: fileService
  name: 'miai-data'
  properties: {
    shareQuota: 50
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${namePrefix}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: log.properties.customerId
        sharedKey: log.listKeys().primarySharedKey
      }
    }
  }
}

resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: env
  name: 'miai-files'
  properties: {
    azureFile: {
      accountName: storage.name
      accountKey: storage.listKeys().keys[0].value
      shareName: fileShare.name
      accessMode: 'ReadWrite'
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01' = {
  name: pgName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'miaiadmin'
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7 }
    highAvailability: { mode: 'Disabled' }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

// 0.0.0.0–0.0.0.0 = Allow Azure services (Container Apps egress)
resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01' = {
  parent: postgres
  name: 'miai_agents'
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: caName
  location: location
  identity: {
    type: 'SystemAssigned,UserAssigned'
    userAssignedIdentities: {
      '${uami.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      registries: registries
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      // Secrets live only in Key Vault; Container App pulls via UAMI (kvRoleUami).
      // Base secrets + one ref per supplied connector credential.
      secrets: concat(
        [
          {
            name: 'database-url'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/database-url'
            identity: uami.id
          }
          {
            name: 'oauth-token-secret'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/oauth-token-secret'
            identity: uami.id
          }
          {
            name: 'oauth-state-secret'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/oauth-state-secret'
            identity: uami.id
          }
          {
            name: 'embed-key-secret'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/embed-key-secret'
            identity: uami.id
          }
          {
            name: 'wallet-api-key'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/wallet-api-key'
            identity: uami.id
          }
          {
            name: 'model-gateway-key'
            keyVaultUrl: '${kv.properties.vaultUri}secrets/model-gateway-key'
            identity: uami.id
          }
        ],
        connectorSecretRefs,
        registryConfigSecrets
      )
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          volumeMounts: [
            {
              volumeName: 'data'
              mountPath: '/data'
            }
          ]
          // Base env + supplied connector client secrets (secretRef) + non-secret connector config.
          env: concat(
            [
              { name: 'NODE_ENV', value: 'production' }
              { name: 'PORT', value: '3000' }
              { name: 'HOSTNAME', value: '0.0.0.0' }
              { name: 'APP_BASE_URL', value: 'https://${appHost}' }
              { name: 'NEXT_PUBLIC_APP_URL', value: 'https://${appHost}' }
              { name: 'CATALOG_DIR', value: '/app/data/catalog' }
              { name: 'RENTAL_STORE_PATH', value: '/data/rentals.json' }
              { name: 'OAUTH_TOKEN_STORE_PATH', value: '/data/oauth-tokens.json' }
              { name: 'KNOWLEDGE_STORE_PATH', value: '/data/knowledge-sources.json' }
              { name: 'MIAI_AUTH_MODE', value: 'oidc' }
              { name: 'MIAI_OIDC_ISSUER', value: oidcIssuer }
              { name: 'MIAI_OIDC_AUDIENCE', value: oidcAudience }
              { name: 'MIAI_OIDC_JWKS_URL', value: oidcJwksUrl }
              { name: 'MIAI_WALLET_MODE', value: 'http' }
              { name: 'MIAI_WALLET_API_URL', value: walletApiUrl }
              { name: 'MIAI_WALLET_API_KEY', secretRef: 'wallet-api-key' }
              { name: 'MIAI_MODEL_MODE', value: 'gateway' }
              { name: 'MIAI_MODEL_GATEWAY_URL', value: modelGatewayUrl }
              { name: 'MIAI_MODEL_GATEWAY_KEY', secretRef: 'model-gateway-key' }
              { name: 'MIAI_MODEL_PASSTHROUGH', value: '1' }
              { name: 'DATABASE_URL', secretRef: 'database-url' }
              { name: 'OAUTH_TOKEN_SECRET', secretRef: 'oauth-token-secret' }
              { name: 'OAUTH_STATE_SECRET', secretRef: 'oauth-state-secret' }
              { name: 'EMBED_KEY_SECRET', secretRef: 'embed-key-secret' }
              { name: 'EMBED_ALLOWED_ORIGINS', value: embedAllowedOrigins }
              { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
            ],
            connectorSecretEnv,
            connectorPlainEnv
          )
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health/live', port: 3000 }
              timeoutSeconds: 5
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3000 }
              timeoutSeconds: 5
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      volumes: [
        {
          name: 'data'
          storageType: 'AzureFile'
          storageName: envStorage.name
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: maxReplicas
      }
    }
  }
  dependsOn: [
    postgresFirewallAzure
    postgresDb
    kvRoleUami
    kvSecretOauth
    kvSecretOauthState
    kvSecretEmbed
    kvSecretWallet
    kvSecretModel
    kvSecretDb
    kvConnectorSecrets
  ]
}

// System-assigned MI can also read KV (runtime / future secret rotation)
resource kvRoleApp 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, app.id, 'kv-secrets-user')
  scope: kv
  properties: {
    roleDefinitionId: roleKeyVaultSecretsUser
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppEnvironmentId string = env.id
output keyVaultName string = kv.name
output keyVaultUri string = kv.properties.vaultUri
output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output containerAppPrincipalId string = app.identity.principalId
output userAssignedIdentityId string = uami.id
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
output databaseName string = postgresDb.name
output storageAccountName string = storage.name
output fileShareName string = fileShare.name
output appInsightsName string = appi.name
output appInsightsConnectionString string = appi.properties.ConnectionString
