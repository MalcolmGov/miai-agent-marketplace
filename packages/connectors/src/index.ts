export type {
  ConnectorId,
  ConnectorMeta,
  ToolBinding,
  ConnectorCall,
  ConnectorResult,
} from "./types.js";

export {
  OAUTH_PROVIDERS,
  isOAuthConnector,
  listOAuthProviders,
  normalizeShop,
  resolveProvider,
  isOAuthConfigured,
  getClientCredentials,
  connectorOAuthConfigured,
  type OAuthConnectorId,
  type OAuthStartContext,
  type OAuthProvider,
} from "./oauth/providers.js";

export {
  buildAuthorizeUrl,
  exchangeCode,
  consumeState,
  createState,
  getValidAccessToken,
  refreshAccessToken,
  publicAppBase,
  oauthCallbackUrl,
  type OAuthStatePayload,
  type AuthorizeStartResult,
} from "./oauth/flow.js";

export {
  saveToken,
  getToken,
  deleteToken,
  listConnected,
  listTokenMeta,
  updateTokenFields,
  type StoredToken,
  type TokenMeta,
} from "./oauth/tokens.js";

export { executeLive, stubFor } from "./live/execute.js";

export {
  assertSafeOutboundUrl,
  assertSafeOutboundUrlOrThrow,
  safeFetch,
  isBlockedIp,
  type SafeUrlResult,
} from "./ssrf.js";

export {
  signWebhookPayload,
  verifyWebhookSignature,
  timingSafeEqualString,
} from "./webhook-sig.js";

import type { ConnectorCall, ConnectorMeta, ConnectorResult } from "./types.js";
import { executeLive, stubFor } from "./live/execute.js";

export const CONNECTORS: ConnectorMeta[] = [
  { id: "mcp", name: "MCP server", phase: 1, description: "Call tools on your HTTP MCP bridge (POST /tools/call).", auth: "mcp", recommended: true },
  { id: "webhook", name: "Webhook", phase: 1, description: "POST events to any URL and wire your backend.", auth: "webhook_secret" },
  { id: "google_calendar", name: "Google Calendar", phase: 1, description: "Availability and bookings.", auth: "oauth" },
  { id: "m365_calendar", name: "Microsoft 365 Calendar", phase: 1, description: "Availability and bookings via Graph.", auth: "oauth" },
  { id: "shopify", name: "Shopify", phase: 1, description: "Orders, products, stock, returns.", auth: "oauth" },
  { id: "hubspot", name: "HubSpot", phase: 1, description: "Leads, contacts, tickets.", auth: "oauth" },
  { id: "slack", name: "Slack", phase: 1, description: "Notify a channel or hand off to a human.", auth: "oauth" },
  { id: "email", name: "Email", phase: 1, description: "Send confirmations and handoff mail (Gmail or Microsoft).", auth: "oauth" },
  { id: "whatsapp", name: "WhatsApp", phase: 1, description: "Customer channel transport (Cloud API).", auth: "api_key" },
  { id: "woocommerce", name: "WooCommerce", phase: 2, description: "Orders, products and stock.", auth: "api_key" },
  { id: "teams", name: "Microsoft Teams", phase: 2, description: "Route escalations into Teams.", auth: "oauth" },
  { id: "xero", name: "Xero", phase: 2, description: "Invoices and payment status.", auth: "oauth" },
  { id: "quickbooks", name: "QuickBooks", phase: 2, description: "US accounting twin of Xero.", auth: "oauth" },
  { id: "stripe", name: "Stripe", phase: 2, description: "Payment links — never raw card in chat.", auth: "api_key" },
  { id: "calendly", name: "Calendly", phase: 2, description: "Booking for teams without calendar OAuth.", auth: "oauth" },
  { id: "zendesk", name: "Zendesk", phase: 2, description: "Ticket desk for create_ticket.", auth: "oauth" },
];

/** Execute a tool via its connector binding. Sandbox always stubs. */
export async function executeConnector(call: ConnectorCall): Promise<ConnectorResult> {
  if (call.mode === "sandbox") {
    return {
      ok: true,
      data: stubFor(call.tool, call.args),
      connector: call.binding.connector,
      stubbed: true,
    };
  }
  return executeLive(call);
}

export function listConnectors(phase?: 1 | 2): ConnectorMeta[] {
  return CONNECTORS.filter((c) => (phase ? c.phase === phase : true));
}

export const WEBHOOK_TEMPLATES = {
  property_enquiry: {
    id: "property_enquiry",
    name: "Property enquiry",
    fields: ["listing_id", "name", "contact", "preferred_time", "notes"],
  },
  hotel_guest_request: {
    id: "hotel_guest_request",
    name: "Hotel guest request",
    fields: ["room", "request_type", "priority", "notes"],
  },
  insurance_fnol: {
    id: "insurance_fnol",
    name: "Insurance FNOL",
    fields: ["policy_number", "incident_date", "description", "contact"],
  },
} as const;

export type WebhookTemplateId = keyof typeof WEBHOOK_TEMPLATES;
