export interface BusinessConnector {
  id: string;
  name: string;
  category: "CRM & Sales" | "Scheduling" | "Messaging" | "Finance" | "Productivity" | "Developer";
  icon: string;
  badgeColor: string;
  description: string;
  defaultTools: string[];
  authMethod: "oauth" | "builtin" | "credentials" | "developer";
  authBadge: string;
  popular?: boolean;
}

export const BUSINESS_CONNECTORS: BusinessConnector[] = ([
  ["hubspot", "HubSpot CRM", "CRM & Sales", "🟠", "#ff7a59", "Capture inbound leads, look up client records, and update deal pipelines.", ["log_crm_lead", "lookup_contact"], "oauth", "OAuth 2.0", true],
  ["google_calendar", "Google Calendar", "Scheduling", "📅", "#4285f4", "Check meeting availability, schedule appointments, and coordinate client calls.", ["schedule_meeting", "check_availability"], "oauth", "Google OAuth", true],
  ["whatsapp", "WhatsApp Business", "Messaging", "💬", "#25d366", "Send WhatsApp appointment confirmations, customer follow-ups, and chat notifications.", ["send_whatsapp_message"], "credentials", "API Token", true],
  ["stripe", "Stripe & Invoicing", "Finance", "💳", "#635bff", "Draft customer invoices, verify payment receipts, and look up overdue accounts.", ["create_invoice", "check_overdue"], "credentials", "API Key", true],
  ["email", "Email (Gmail / Outlook)", "Messaging", "✉️", "#ea4335", "Dispatch branded confirmation emails, summaries, and client proposals.", ["send_email"], "oauth", "OAuth 2.0", true],
  ["slack", "Slack", "Messaging", "🔔", "#4a154b", "Send internal alerts, log captured leads, and notify team members in channels.", ["post_slack_alert", "handoff_to_human"], "oauth", "Slack OAuth", true],
  ["query_knowledge", "Company Knowledge Base", "Productivity", "📚", "#0d9482", "Grounded semantic retrieval across uploaded company PDFs, FAQs, and service sheets.", ["query_knowledge"], "builtin", "Ready Instantly", true],
  ["calendly", "Calendly", "Scheduling", "⏱️", "#006bff", "Provide Calendly booking links and synchronize appointment bookings.", ["schedule_meeting"], "oauth", "OAuth 2.0", false],
  ["zendesk", "Zendesk Support", "CRM & Sales", "🎧", "#03363d", "Create customer support tickets and escalate complex inquiries to human agents.", ["create_ticket", "handoff_to_human"], "oauth", "OAuth 2.0", false],
  ["notion", "Notion", "Productivity", "📝", "#000000", "Append tasks, sync meeting summaries, and create client project notes in Notion.", ["create_task"], "oauth", "OAuth 2.0", false],
  ["webhook", "Custom Webhook", "Developer", "⚡", "#f59e0b", "Dispatch real-time HTTP POST JSON events to your own CRM, ERP, or server backend.", ["webhook_dispatch"], "developer", "Webhook URL", false],
  ["mcp", "MCP Server", "Developer", "🔌", "#8b5cf6", "Connect to a Model Context Protocol tool server for custom enterprise actions.", ["mcp_tool_call"], "developer", "SSE / Token", false],
] as const).map(
  ([id, name, category, icon, badgeColor, description, defaultTools, authMethod, authBadge, popular]): BusinessConnector => ({
    id,
    name,
    category: category as BusinessConnector["category"],
    icon,
    badgeColor,
    description,
    defaultTools: [...defaultTools],
    authMethod: authMethod as BusinessConnector["authMethod"],
    authBadge,
    ...(popular ? { popular: true } : {}),
  }),
);

export interface ToneOption {
  id: string;
  label: string;
  description: string;
  promptGuidance: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  {
    id: "professional",
    label: "Professional & Formal",
    description: "Polite, structured, and enterprise-grade communication.",
    promptGuidance: "Maintain a polished, respectful, and authoritative tone suitable for corporate stakeholders.",
  },
  {
    id: "friendly",
    label: "Friendly & Warm",
    description: "Approachable, conversational, and helpful tone.",
    promptGuidance: "Speak in a warm, welcoming, and empathetic voice that makes customers feel valued and understood.",
  },
  {
    id: "consultative",
    label: "Consultative Sales",
    description: "Curious, inquisitive, and value-focused.",
    promptGuidance: "Ask strategic questions to uncover customer pain points and guide them naturally toward the best solution.",
  },
  {
    id: "concise",
    label: "Concise & Direct",
    description: "Brief, efficient, and to the point.",
    promptGuidance: "Keep responses brief, accurate, and actionable without unnecessary fluff.",
  },
];

export function toolsForConnectors(connectorIds: string[]): string[] {
  const tools = new Set<string>();
  for (const cid of connectorIds) {
    const found = BUSINESS_CONNECTORS.find((c) => c.id === cid);
    if (found) {
      for (const t of found.defaultTools) {
        tools.add(t);
      }
    }
  }
  return [...tools];
}
