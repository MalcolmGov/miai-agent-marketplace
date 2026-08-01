// Azure landing zone for Agent Marketplace
// Container Apps + Postgres + Key Vault + Azure Files + Log Analytics + App Insights
targetScope = 'resourceGroup'

@description('Azure region')
param location string = resourceGroup().location

@description('Name prefix for resources')
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

@secure()
@description('Optional override; auto-generated when empty')
param oauthTokenSecretParam string = ''

@secure()
@description('Optional override; auto-generated when empty')
param oauthStateSecretParam string = ''

@secure()
@description('Optional override; defaults to oauth token secret')
param embedKeySecretParam string = ''

var kvName = take('${namePrefix}-kv', 24)
var pgName = take('${namePrefix}-pg', 60)
var caName = take('${namePrefix}-web', 32)
var storageName = take(toLower(replace('${namePrefix}st', '-', '')), 24)
var uamiName = take('${namePrefix}-uami', 128)
var oauthTokenSecret = empty(oauthTokenSecretParam) ? uniqueString(resourceGroup().id, namePrefix, 'oauth') : oauthTokenSecretParam
var oauthStateSecret = empty(oauthStateSecretParam) ? uniqueString(resourceGroup().id, namePrefix, 'state') : oauthStateSecretParam
var embedKeySecret = empty(embedKeySecretParam) ? oauthTokenSecret : embedKeySecretParam

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

resource kvSecretDb 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'database-url'
  properties: {
    value: 'postgresql://miaiadmin:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/miai_agents?sslmode=require'
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
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      // Secrets live only in Key Vault; Container App pulls via UAMI (kvRoleUami).
      secrets: [
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
      ]
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
          env: [
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
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health', port: 3000 }
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: { path: '/api/health', port: 3000 }
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
        maxReplicas: 5
      }
    }
  }
  dependsOn: [
    postgresFirewallAzure
    postgresDb
    fileShare
    kvRoleUami
    kvSecretOauth
    kvSecretOauthState
    kvSecretEmbed
    kvSecretWallet
    kvSecretModel
    kvSecretDb
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
