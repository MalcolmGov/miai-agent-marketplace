// Azure landing zone for Agent Marketplace
// Container Apps + Postgres + Key Vault + Log Analytics
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

@description('MyInstantAI wallet API base URL')
param walletApiUrl string = ''

@secure()
param walletApiKey string = ''

@description('MyInstantAI model gateway URL')
param modelGatewayUrl string = ''

@secure()
param modelGatewayKey string = ''

var kvName = take('${namePrefix}-kv', 24)
var pgName = take('${namePrefix}-pg', 60)
var caName = take('${namePrefix}-web', 32)

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
  }
}

resource log 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${namePrefix}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' } }
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
    type: 'SystemAssigned'
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
      secrets: [
        {
          name: 'database-url'
          value: 'postgresql://miaiadmin:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/miai_agents?sslmode=require'
        }
        {
          name: 'oauth-token-secret'
          value: uniqueString(resourceGroup().id, namePrefix)
        }
        {
          name: 'wallet-api-key'
          value: walletApiKey
        }
        {
          name: 'model-gateway-key'
          value: modelGatewayKey
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
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'HOSTNAME', value: '0.0.0.0' }
            { name: 'APP_BASE_URL', value: 'https://${appHost}' }
            { name: 'NEXT_PUBLIC_APP_URL', value: 'https://${appHost}' }
            { name: 'CATALOG_DIR', value: '/app/data/catalog' }
            { name: 'RENTAL_STORE_PATH', value: '/tmp/rentals.json' }
            { name: 'OAUTH_TOKEN_STORE_PATH', value: '/tmp/oauth-tokens.json' }
            { name: 'KNOWLEDGE_STORE_PATH', value: '/tmp/knowledge-sources.json' }
            { name: 'MIAI_AUTH_MODE', value: 'oidc' }
            { name: 'MIAI_OIDC_ISSUER', value: oidcIssuer }
            { name: 'MIAI_WALLET_MODE', value: 'http' }
            { name: 'MIAI_WALLET_API_URL', value: walletApiUrl }
            { name: 'MIAI_WALLET_API_KEY', secretRef: 'wallet-api-key' }
            { name: 'MIAI_MODEL_MODE', value: 'gateway' }
            { name: 'MIAI_MODEL_GATEWAY_URL', value: modelGatewayUrl }
            { name: 'MIAI_MODEL_GATEWAY_KEY', secretRef: 'model-gateway-key' }
            { name: 'MIAI_MODEL_PASSTHROUGH', value: '1' }
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'OAUTH_TOKEN_SECRET', secretRef: 'oauth-token-secret' }
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
      scale: {
        minReplicas: 1
        maxReplicas: 5
      }
    }
  }
}

output containerAppEnvironmentId string = env.id
output keyVaultName string = kv.name
output containerAppFqdn string = app.properties.configuration.ingress.fqdn
output postgresFqdn string = postgres.properties.fullyQualifiedDomainName
output databaseName string = postgresDb.name
