export type ConnectorId =
  | "webhook"
  | "mcp"
  | "google_calendar"
  | "m365_calendar"
  | "shopify"
  | "hubspot"
  | "slack"
  | "email"
  | "whatsapp"
  | "woocommerce"
  | "teams"
  | "xero"
  | "quickbooks"
  | "stripe"
  | "calendly"
  | "zendesk"
  | "web_search"
  | "weather"
  | "google_tasks"
  | "google_contacts"
  | "google_drive"
  | "notion"
  | "spotify"
  | "todoist"
  | "youtube";

export interface ConnectorMeta {
  id: ConnectorId;
  name: string;
  phase: 1 | 2;
  description: string;
  auth: "oauth" | "api_key" | "webhook_secret" | "mcp";
  recommended?: boolean;
}

export interface ToolBinding {
  tool: string;
  connector: ConnectorId;
  config?: Record<string, string>;
}

export interface ConnectorCall {
  workspaceId: string;
  agentId: string;
  tool: string;
  args: Record<string, unknown>;
  binding: ToolBinding;
  mode: "sandbox" | "live";
}

export interface ConnectorResult {
  ok: boolean;
  data: Record<string, unknown>;
  connector: ConnectorId;
  stubbed: boolean;
}
