export type AgentTier = "standard" | "pro" | "enterprise";
export type AgentCategory =
  | "front-office"
  | "sales"
  | "commerce"
  | "operations"
  | "vertical";

export interface AgentManifest {
  id: string;
  name: string;
  version: string;
  category: AgentCategory;
  tier: AgentTier;
  summary: string;
  channels: string[];
  languages: string[];
  market?: string;
  compliance?: string[];
  model: {
    primary: string;
    fallback?: string;
    temperature: number;
    max_output_tokens: number;
  };
  handoff?: {
    enabled: boolean;
    target?: string;
    triggers?: string[];
  };
  usage_profile?: {
    tier_cap_msgs_month?: number;
    avg_tokens_per_msg?: number;
  };
  prepaid?: {
    skus?: Array<{
      sku: string;
      label: string;
      capacity: string;
      price_band?: string;
    }>;
  };
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  returns?: string;
  side_effects?: "read-only" | "write" | "financial";
  auth_scope?: string;
}

export interface AgentPackage {
  format: "miai.agent-package/v1";
  manifest: AgentManifest;
  system_prompt: string;
  knowledge: string;
  tools: AgentTool[];
  guardrails: string;
  evals: unknown[];
}

export const RENT_USD: Record<AgentTier, number> = {
  standard: 349,
  pro: 699,
  enterprise: 1199,
};

export const RENT_EUR: Record<AgentTier, number> = {
  standard: 319,
  pro: 649,
  enterprise: 1099,
};

/** Primary audience for catalogue chips / filters. */
export type AgentAudience = "customer" | "internal";

/**
 * Customer-facing vs internal workforce agents.
 * `operations` maps to HR & internal ops (audience: internal); all other categories are customer-facing.
 */
export function agentAudience(category: AgentCategory | string): AgentAudience {
  return category === "operations" ? "internal" : "customer";
}

export function marketplaceCategory(manifest: AgentManifest): string {
  const map: Record<string, string> = {
    "front-office": "Customer & front office",
    sales: "Professional services",
    commerce: "Retail & e-commerce",
    operations: "HR & internal ops",
    vertical: "Health & wellness",
  };
  const id = manifest.id;
  // Wave 3–4 sector families first (avoid collisions e.g. sales-forecasting vs sales-*)
  if (/ai-coding|documentation-assistant|qa-testing|devops-assistant|prompt-engineering/.test(id))
    return "AI & developer tools";
  if (/bi-analyst|financial-reporting|sales-forecasting|executive-dashboards|data-quality/.test(id))
    return "Data & analytics";
  if (/cybersecurity-desk|security-incident/.test(id)) return "Cybersecurity";
  if (/energy-operations/.test(id)) return "Energy & utilities";
  if (/farm-operations|agri-advisory/.test(id)) return "Agriculture";
  if (/media-content-desk/.test(id)) return "Media & entertainment";
  // Wave 1–2 sector families (id may be prefixed us-|eu-|…)
  if (/sim-registration|airtime-bundles|fibre-support|network-faults|device-upgrades|enterprise-connectivity/.test(id))
    return "Telecommunications";
  if (/citizen-services|municipality-desk|tax-office|passport|licensing|social-services/.test(id))
    return "Government & public sector";
  if (/warehouse-operations|maintenance-desk|quality-assurance|factory-operations|production-planning/.test(id))
    return "Manufacturing & industrial";
  if (/hotel|travel|restaurant|salon|gym|tour|events/.test(id))
    return "Hospitality & travel";
  if (/dental|clinic|pharmacy|veterinary/.test(id)) return "Health & wellness";
  if (
    /insurance|loan|bank|payroll|utility|accounting|bookkeeping|remittance|mobile-money|mortgage|credit-cards|payment-disputes|wealth-management|investment-advisor|fraud-investigations/.test(
      id,
    )
  )
    return "Financial services";
  if (/property|rental|building/.test(id)) return "Property";
  // NOTE: onboarding-buddy is intentionally NOT here — it's employee onboarding (operations/internal)
  // and is matched by the "HR & internal ops" rule below. Listing it here shadowed that rule and
  // mis-filed all *-onboarding-buddy agents under Education (a student/course category).
  if (/student|course|admission/.test(id)) return "Education";
  if (/fleet|field|delivery|order-tracking|stock-availability|home-services|trades|grant-stock/.test(id))
    return "Logistics & field ops";
  if (/recruitment|interview-scheduling|hr-helpdesk|it-helpdesk|executive-assistant|policy-compliance|procurement|onboarding-buddy|learning-development|performance-reviews/.test(id))
    return "HR & internal ops";
  if (/law|contract-review|case-management|legal-research|marketing|sales-qualifier|agency/.test(id))
    return "Professional services";
  if (/order|vas|product|returns|loyalty|spaza/.test(id)) return "Retail & e-commerce";
  return map[manifest.category] ?? "All agents";
}

export function loadAgentPackage(raw: unknown): AgentPackage {
  const pkg = raw as AgentPackage;
  if (!pkg || pkg.format !== "miai.agent-package/v1") {
    throw new Error("Invalid agent package format");
  }
  if (!pkg.manifest?.id || !pkg.system_prompt || !Array.isArray(pkg.tools)) {
    throw new Error("Agent package missing required fields");
  }
  return pkg;
}

/**
 * Phase 4: Agent-to-Agent (A2A) Delegation Protocol
 * Standard contract for routing complex multi-domain tasks between specialized agents.
 */
export interface A2ADelegationRequest {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  workspaceId: string;
  taskGoal: string;
  contextPayload: Record<string, unknown>;
  priority?: "low" | "normal" | "urgent";
  timeoutMs?: number;
}

export interface A2ADelegationResult {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: "completed" | "rejected" | "escalated" | "failed";
  resultSummary: string;
  data: Record<string, unknown>;
  tokensConsumed?: number;
}

/**
 * Phase 4: Multimodal Voice Session Specification
 * Low-latency real-time voice streaming config (WebRTC / WebSocket).
 */
export interface VoiceSessionConfig {
  sessionId: string;
  agentId: string;
  workspaceId: string;
  voiceProvider: "elevenlabs" | "azure_speech" | "custom_tts";
  voiceId?: string;
  sampleRate: 16000 | 24000 | 48000;
  audioEncoding: "pcm16" | "opus" | "mp3";
  turnDetection?: {
    type: "server_vad" | "client_vad";
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
  };
}

