/**
 * Official Brand SVG Icons from theSVG (thesvg.org).
 * Standardized for crisp, high-resolution rendering across dark/light themes.
 */

export const CONNECTOR_BRAND_ICONS: Record<string, { svgPath?: string; emojiFallback: string; label: string }> = {
  hubspot: {
    svgPath: "/icons/connectors/hubspot.svg",
    emojiFallback: "🟠",
    label: "HubSpot",
  },
  google_calendar: {
    svgPath: "/icons/connectors/google-calendar.svg",
    emojiFallback: "📅",
    label: "Google Calendar",
  },
  calendar: {
    svgPath: "/icons/connectors/google-calendar.svg",
    emojiFallback: "📅",
    label: "Calendar",
  },
  m365_calendar: {
    svgPath: "/icons/connectors/microsoft.svg",
    emojiFallback: "📅",
    label: "Microsoft 365 Calendar",
  },
  slack: {
    svgPath: "/icons/connectors/slack.svg",
    emojiFallback: "💬",
    label: "Slack",
  },
  whatsapp: {
    svgPath: "/icons/connectors/whatsapp.svg",
    emojiFallback: "💬",
    label: "WhatsApp",
  },
  stripe: {
    svgPath: "/icons/connectors/stripe.svg",
    emojiFallback: "💳",
    label: "Stripe",
  },
  shopify: {
    svgPath: "/icons/connectors/shopify.svg",
    emojiFallback: "🛍️",
    label: "Shopify",
  },
  zendesk: {
    svgPath: "/icons/connectors/zendesk.svg",
    emojiFallback: "🎧",
    label: "Zendesk",
  },
  notion: {
    svgPath: "/icons/connectors/notion.svg",
    emojiFallback: "📝",
    label: "Notion",
  },
  calendly: {
    svgPath: "/icons/connectors/calendly.svg",
    emojiFallback: "⏱️",
    label: "Calendly",
  },
  woocommerce: {
    svgPath: "/icons/connectors/woocommerce.svg",
    emojiFallback: "🛒",
    label: "WooCommerce",
  },
  xero: {
    svgPath: "/icons/connectors/xero.svg",
    emojiFallback: "📊",
    label: "Xero",
  },
  quickbooks: {
    svgPath: "/icons/connectors/quickbooks.svg",
    emojiFallback: "📗",
    label: "QuickBooks",
  },
  email: {
    svgPath: "/icons/connectors/gmail.svg",
    emojiFallback: "✉️",
    label: "Email",
  },
  gmail: {
    svgPath: "/icons/connectors/gmail.svg",
    emojiFallback: "✉️",
    label: "Gmail",
  },
  teams: {
    svgPath: "/icons/connectors/microsoft-teams.svg",
    emojiFallback: "👥",
    label: "Microsoft Teams",
  },
  query_knowledge: {
    emojiFallback: "📚",
    label: "Knowledge Base",
  },
  webhook: {
    emojiFallback: "⚡",
    label: "Webhook",
  },
  mcp: {
    emojiFallback: "🔌",
    label: "MCP",
  },
};

export function getConnectorIcon(id: string): { svgPath?: string; emojiFallback: string; label: string } {
  if (CONNECTOR_BRAND_ICONS[id]) {
    return CONNECTOR_BRAND_ICONS[id];
  }
  if (id.includes("calendar")) {
    return CONNECTOR_BRAND_ICONS.google_calendar;
  }
  if (id.includes("mail")) {
    return CONNECTOR_BRAND_ICONS.email;
  }
  return { emojiFallback: "🔌", label: id };
}
