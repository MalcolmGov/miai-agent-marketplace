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
  // Wave 3+ sector families first (avoid collisions e.g. sales-forecasting vs sales-*)
  if (/ai-coding|documentation-assistant|qa-testing|devops-assistant|prompt-engineering/.test(id))
    return "AI & developer tools";
  if (/bi-analyst|financial-reporting|sales-forecasting|executive-dashboards|data-quality/.test(id))
    return "Data & analytics";
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
  if (/student|course|admission|onboarding-buddy/.test(id)) return "Education";
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
