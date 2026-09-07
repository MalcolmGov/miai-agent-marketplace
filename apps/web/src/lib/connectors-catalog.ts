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

export const BUSINESS_CONNECTORS: BusinessConnector[] = [
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "CRM & Sales",
    icon: "🟠",
    badgeColor: "#ff7a59",
    description: "Capture inbound leads, look up client records, and update deal pipelines.",
    defaultTools: ["log_crm_lead", "lookup_contact"],
    authMethod: "oauth",
    authBadge: "OAuth 2.0",
    popular: true,
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Scheduling",
    icon: "📅",
    badgeColor: "#4285f4",
    description: "Check meeting availability, schedule appointments, and coordinate client calls.",
    defaultTools: ["schedule_meeting", "check_availability"],
    authMethod: "oauth",
    authBadge: "Google OAuth",
    popular: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    icon: "💬",
    badgeColor: "#25d366",
    description: "Send WhatsApp appointment confirmations, customer follow-ups, and chat notifications.",
    defaultTools: ["send_whatsapp_message"],
    authMethod: "credentials",
    authBadge: "API Token",
    popular: true,
  },
  {
    id: "stripe",
    name: "Stripe & Invoicing",
    category: "Finance",
    icon: "💳",
    badgeColor: "#635bff",
    description: "Draft customer invoices, verify payment receipts, and look up overdue accounts.",
    defaultTools: ["create_invoice", "check_overdue"],
    authMethod: "credentials",
    authBadge: "API Key",
    popular: true,
  },
  {
    id: "email",
    name: "Email (Gmail / Outlook)",
    category: "Messaging",
    icon: "✉️",
    badgeColor: "#ea4335",
    description: "Dispatch branded confirmation emails, summaries, and client proposals.",
    defaultTools: ["send_email"],
    authMethod: "oauth",
    authBadge: "OAuth 2.0",
    popular: true,
  },
  {
    id: "slack",
    name: "Slack",
    category: "Messaging",
    icon: "🔔",
    badgeColor: "#4a154b",
    description: "Send internal alerts, log captured leads, and notify team members in channels.",
    defaultTools: ["post_slack_alert", "handoff_to_human"],
    authMethod: "oauth",
    authBadge: "Slack OAuth",
    popular: true,
  },
  {
    id: "query_knowledge",
    name: "Company Knowledge Base",
    category: "Productivity",
    icon: "📚",
    badgeColor: "#0d9482",
    description: "Grounded semantic retrieval across uploaded company PDFs, FAQs, and service sheets.",
    defaultTools: ["query_knowledge"],
    authMethod: "builtin",
    authBadge: "Ready Instantly",
    popular: true,
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "Scheduling",
    icon: "⏱️",
    badgeColor: "#006bff",
    description: "Provide Calendly booking links and synchronize appointment bookings.",
    defaultTools: ["schedule_meeting"],
    authMethod: "oauth",
    authBadge: "OAuth 2.0",
  },
  {
    id: "zendesk",
    name: "Zendesk Support",
    category: "CRM & Sales",
    icon: "🎧",
    badgeColor: "#03363d",
    description: "Create customer support tickets and escalate complex inquiries to human agents.",
    defaultTools: ["create_ticket", "handoff_to_human"],
    authMethod: "oauth",
    authBadge: "OAuth 2.0",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    icon: "📝",
    badgeColor: "#000000",
    description: "Append tasks, sync meeting summaries, and create client project notes in Notion.",
    defaultTools: ["create_task"],
    authMethod: "oauth",
    authBadge: "OAuth 2.0",
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    category: "Developer",
    icon: "⚡",
    badgeColor: "#f59e0b",
    description: "Dispatch real-time HTTP POST JSON events to your own CRM, ERP, or server backend.",
    defaultTools: ["webhook_dispatch"],
    authMethod: "developer",
    authBadge: "Webhook URL",
  },
  {
    id: "mcp",
    name: "MCP Server",
    category: "Developer",
    icon: "🔌",
    badgeColor: "#8b5cf6",
    description: "Connect to a Model Context Protocol tool server for custom enterprise actions.",
    defaultTools: ["mcp_tool_call"],
    authMethod: "developer",
    authBadge: "SSE / Token",
  },
];

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
