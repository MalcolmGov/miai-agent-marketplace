/** Meeting-ready Trust Center copy — keep claims honest and region-specific. */

export type Status = "shipped" | "in_progress" | "planned";

export const SECURITY_CONTROLS: Array<{
  title: string;
  status: Status;
  body: string;
}> = [
  {
    title: "Workspace identity (OIDC)",
    status: "shipped",
    body: "Bearer JWT verification against MyInstantAI JWKS when MIAI_AUTH_MODE=oidc. Workspace and user claims drive tenancy. Mock mode is for demos only.",
  },
  {
    title: "Operator RBAC",
    status: "shipped",
    body: "Agent Admin requires an admin / operator role on the token. Workspace APIs stay scoped to the caller’s workspace_id.",
  },
  {
    title: "HMAC embed keys",
    status: "shipped",
    body: "Website widgets authenticate with deterministic public keys (mia_pk_…) HMAC-bound to workspace + agent. Keys alone cannot mint a live agent.",
  },
  {
    title: "Embed entitlement + rate limits",
    status: "shipped",
    body: "Embed chat only serves agents already rented and live (or paused for tokens). Per-key rate limit: 30 requests / minute.",
  },
  {
    title: "OAuth connector hygiene",
    status: "shipped",
    body: "PKCE + HMAC-signed state (15 min TTL). Access tokens are HMAC-sealed at rest and never injected into LLM prompts. Disconnect revokes the binding.",
  },
  {
    title: "Workspace audit trail",
    status: "shipped",
    body: "Rent, configure, chat, embed, knowledge, OAuth, and wallet events are recorded with workspaceId, agentId, timestamp, and detail — queryable via /api/audit.",
  },
  {
    title: "Security response headers",
    status: "shipped",
    body: "X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy, and CSP Report-Only on all app responses.",
  },
  {
    title: "AES token encryption at rest",
    status: "planned",
    body: "Upgrade from HMAC seal to AES-256-GCM in Azure Key Vault–backed storage before production cutover.",
  },
  {
    title: "SOC 2 Type II",
    status: "planned",
    body: "Evidence collection against MyInstantAI / Azure control plane once production traffic and DPA pack are live.",
  },
];

export const REGION_PACKS: Array<{
  id: string;
  label: string;
  frameworks: string[];
  emergency: string;
  channels: string[];
  agentLayer: string;
  platformNote: string;
}> = [
  {
    id: "us",
    label: "United States",
    frameworks: ["CCPA", "TCPA", "HIPAA (health agents — BAA required)"],
    emergency: "911",
    channels: ["SMS", "Web", "App"],
    agentLayer:
      "US market packs bake TCPA (no cold outreach, honor STOP), CCPA minimisation, and health-agent HIPAA caution into prompts and guardrails.",
    platformNote:
      "Platform stores workspace data in the deployed Azure/Railway region. HIPAA workloads require a signed BAA and health-family agents only.",
  },
  {
    id: "eu",
    label: "European Union",
    frameworks: ["GDPR", "ePrivacy (marketing)"],
    emergency: "112",
    channels: ["SMS", "Web", "App"],
    agentLayer:
      "EU packs minimise personal data, refuse cross-customer disclosure, and hand GDPR access/erasure requests to a human — never auto-delete in chat.",
    platformNote:
      "EU data residency pinning (EU-only Postgres + region lock) is on the Azure roadmap. Today: deploy region = chosen cloud region.",
  },
  {
    id: "africa",
    label: "Africa (incl. South Africa)",
    frameworks: ["POPIA-style", "Regional privacy norms"],
    emergency: "Local emergency services",
    channels: ["WhatsApp", "Web", "App", "SMS"],
    agentLayer:
      "Africa packs follow POPIA-style collection limits, WhatsApp-first flows, and escalate sensitive HR/payroll/medical matters to a person.",
    platformNote:
      "ZA customers are covered under the Africa market pack. Country-specific residency can be selected at Azure deploy time.",
  },
  {
    id: "asia",
    label: "Asia-Pacific",
    frameworks: ["PDPA-style", "Regional privacy norms"],
    emergency: "Local emergency services",
    channels: ["Web", "App", "SMS"],
    agentLayer:
      "Asia packs apply PDPA-style minimisation, opt-out via human handoff, and no cold marketing messages.",
    platformNote:
      "APAC residency follows the customer’s Azure region choice. Cross-border transfer terms land with the DPA pack.",
  },
];

export const DATA_CLASSES: Array<{ name: string; examples: string; retention: string }> = [
  {
    name: "Workspace rentals & config",
    examples: "Agent id, tier, state, model, connector bindings, public embed key",
    retention: "For the life of the tenancy; deleted on workspace offboarding",
  },
  {
    name: "Conversation & audit events",
    examples: "Turn timestamps, tokens debited, tool errors, rent/configure/OAuth events",
    retention: "Operational trail (capped store today); immutable export planned with SOC2 evidence",
  },
  {
    name: "Knowledge sources",
    examples: "Pastes, uploads, crawled pages attached to an agent",
    retention: "Until the partner deletes the source or the agent is removed",
  },
  {
    name: "OAuth connector tokens",
    examples: "Google, Microsoft, Slack, Shopify, HubSpot, etc.",
    retention: "Until disconnect; sealed at rest; never sent to the model",
  },
  {
    name: "Wallet / token metering",
    examples: "Balances, top-ups, per-turn debits",
    retention: "Billing period + statutory retention once MIAI wallet is authoritative",
  },
];

export const SUBPROCESSORS: Array<{ name: string; role: string; region: string }> = [
  { name: "MyInstantAI", role: "Identity (OIDC), wallet, model gateway (production)", region: "Customer Azure tenancy" },
  { name: "Microsoft Azure", role: "Container Apps, Postgres, Key Vault, App Insights (target)", region: "Deploy-time region" },
  { name: "Railway", role: "Staging host (pre-Azure cutover)", region: "US (staging)" },
  { name: "LLM providers via MIAI gateway", role: "Model inference (no connector secrets in prompts)", region: "Per gateway policy" },
  { name: "OAuth vendors (Google, Microsoft, Slack, …)", role: "Connector authorisation", region: "Vendor regions" },
];

export const ROADMAP_SECURITY: Array<{ when: string; item: string; status: Status }> = [
  { when: "Now", item: "OIDC adapter, RBAC on Admin, embed entitlement, rate limits, security headers, Trust Center", status: "shipped" },
  { when: "Next", item: "AES-GCM token encryption, Key Vault secrets, CSP enforce mode, DSAR export API", status: "in_progress" },
  { when: "Azure cutover", item: "Per-tenant region pin, EU/ZA/APAC residency options, App Insights SIEM hooks", status: "planned" },
  { when: "Post-GA", item: "SOC 2 Type II, DPA + subprocessor schedule, breach playbook SLA", status: "planned" },
];

export function statusLabel(s: Status): string {
  if (s === "shipped") return "Shipped";
  if (s === "in_progress") return "In progress";
  return "Planned";
}
