import type { ConnectorId } from "../types.js";

export type OAuthConnectorId = Extract<
  ConnectorId,
  | "google_calendar"
  | "m365_calendar"
  | "shopify"
  | "hubspot"
  | "slack"
  | "email"
  | "teams"
  | "xero"
  | "quickbooks"
  | "calendly"
  | "zendesk"
  | "google_tasks"
  | "google_contacts"
  | "google_drive"
  | "notion"
  | "spotify"
  | "todoist"
>;

export interface OAuthStartContext {
  shop?: string;
  subdomain?: string;
  /** google | microsoft — for email connector */
  emailProvider?: "google" | "microsoft";
}

export interface OAuthProvider {
  id: OAuthConnectorId;
  name: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
  pkce: boolean;
  requiresShop?: boolean;
  requiresSubdomain?: boolean;
  authorizeUrl: (ctx: OAuthStartContext) => string;
  tokenUrl: (ctx: OAuthStartContext) => string;
  extraAuthParams?: Record<string, string>;
  /** Some providers return refresh; others use rotating refresh tokens. */
  authStyle: "body" | "basic";
}

function env(name: string): string {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name] ?? "";
}

export function getClientCredentials(provider: OAuthProvider): { clientId: string; clientSecret: string } {
  return {
    clientId: env(provider.clientIdEnv),
    clientSecret: env(provider.clientSecretEnv),
  };
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  const { clientId, clientSecret } = getClientCredentials(provider);
  return Boolean(clientId && clientSecret);
}

export const OAUTH_PROVIDERS: Record<OAuthConnectorId, OAuthProvider> = {
  google_calendar: {
    id: "google_calendar",
    name: "Google Calendar",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    scopes: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
    ],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: () => "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  email: {
    id: "email",
    name: "Email (Gmail / Microsoft)",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID", // overridden for microsoft at runtime
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    // gmail.send = live send tool; gmail.readonly = inbox triage (list/search + snippet
    // previews) and covers the users/me/profile health probe. readonly supersedes the older
    // gmail.metadata grant; existing metadata-only tokens still work via gmailTriage's fallback.
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "openid",
      "email",
    ],
    pkce: true,
    authStyle: "body",
    authorizeUrl: (ctx) =>
      ctx.emailProvider === "microsoft"
        ? "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        : "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: (ctx) =>
      ctx.emailProvider === "microsoft"
        ? "https://login.microsoftonline.com/common/oauth2/v2.0/token"
        : "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  google_tasks: {
    id: "google_tasks",
    name: "Google Tasks",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/tasks", "openid", "email"],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: () => "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  google_contacts: {
    id: "google_contacts",
    name: "Google Contacts",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    scopes: ["https://www.googleapis.com/auth/contacts.readonly", "openid", "email"],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: () => "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  google_drive: {
    id: "google_drive",
    name: "Google Drive",
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    // drive.readonly is a Google restricted scope (verification needed for GA; test users work now).
    scopes: ["https://www.googleapis.com/auth/drive.readonly", "openid", "email"],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: () => "https://oauth2.googleapis.com/token",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  m365_calendar: {
    id: "m365_calendar",
    name: "Microsoft 365 Calendar",
    clientIdEnv: "MICROSOFT_OAUTH_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_OAUTH_CLIENT_SECRET",
    scopes: [
      "offline_access",
      "openid",
      "profile",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
    ],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: () => "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  teams: {
    id: "teams",
    name: "Microsoft Teams",
    clientIdEnv: "MICROSOFT_OAUTH_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_OAUTH_CLIENT_SECRET",
    scopes: [
      "offline_access",
      "openid",
      "profile",
      "https://graph.microsoft.com/ChannelMessage.Send",
      "https://graph.microsoft.com/Chat.ReadWrite",
      "https://graph.microsoft.com/User.Read",
    ],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: () => "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  },
  shopify: {
    id: "shopify",
    name: "Shopify",
    clientIdEnv: "SHOPIFY_OAUTH_CLIENT_ID",
    clientSecretEnv: "SHOPIFY_OAUTH_CLIENT_SECRET",
    scopes: ["read_orders", "write_orders", "read_products", "read_inventory"],
    pkce: false,
    requiresShop: true,
    authStyle: "body",
    authorizeUrl: (ctx) => {
      const shop = normalizeShop(ctx.shop);
      if (!shop) throw new Error("Shopify shop domain required (e.g. my-store.myshopify.com)");
      return `https://${shop}/admin/oauth/authorize`;
    },
    tokenUrl: (ctx) => {
      const shop = normalizeShop(ctx.shop);
      if (!shop) throw new Error("Shopify shop domain required");
      return `https://${shop}/admin/oauth/access_token`;
    },
    // Shopify expects comma-separated scopes — handled in buildAuthorizeUrl
  },
  hubspot: {
    id: "hubspot",
    name: "HubSpot",
    clientIdEnv: "HUBSPOT_OAUTH_CLIENT_ID",
    clientSecretEnv: "HUBSPOT_OAUTH_CLIENT_SECRET",
    scopes: [
      "crm.objects.contacts.write",
      "crm.objects.contacts.read",
      "tickets",
      "oauth",
    ],
    pkce: false,
    authStyle: "body",
    authorizeUrl: () => "https://app.hubspot.com/oauth/authorize",
    tokenUrl: () => "https://api.hubapi.com/oauth/v1/token",
  },
  slack: {
    id: "slack",
    name: "Slack",
    clientIdEnv: "SLACK_OAUTH_CLIENT_ID",
    clientSecretEnv: "SLACK_OAUTH_CLIENT_SECRET",
    scopes: ["chat:write", "channels:read", "channels:join", "groups:read", "users:read"],
    pkce: false,
    authStyle: "body",
    authorizeUrl: () => "https://slack.com/oauth/v2/authorize",
    tokenUrl: () => "https://slack.com/api/oauth.v2.access",
  },
  xero: {
    id: "xero",
    name: "Xero",
    clientIdEnv: "XERO_OAUTH_CLIENT_ID",
    clientSecretEnv: "XERO_OAUTH_CLIENT_SECRET",
    scopes: ["openid", "profile", "email", "accounting.transactions", "offline_access"],
    pkce: true,
    authStyle: "basic",
    authorizeUrl: () => "https://login.xero.com/identity/connect/authorize",
    tokenUrl: () => "https://identity.xero.com/connect/token",
  },
  quickbooks: {
    id: "quickbooks",
    name: "QuickBooks",
    clientIdEnv: "QUICKBOOKS_OAUTH_CLIENT_ID",
    clientSecretEnv: "QUICKBOOKS_OAUTH_CLIENT_SECRET",
    scopes: ["com.intuit.quickbooks.accounting"],
    pkce: false,
    authStyle: "basic",
    authorizeUrl: () => "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: () => "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  },
  calendly: {
    id: "calendly",
    name: "Calendly",
    clientIdEnv: "CALENDLY_OAUTH_CLIENT_ID",
    clientSecretEnv: "CALENDLY_OAUTH_CLIENT_SECRET",
    // Calendly OAuth apps expect PKCE (S256). scopes space-separated.
    scopes: ["users:read", "event_types:read", "scheduled_events:read"],
    pkce: true,
    authStyle: "body",
    authorizeUrl: () => "https://auth.calendly.com/oauth/authorize",
    tokenUrl: () => "https://auth.calendly.com/oauth/token",
  },
  zendesk: {
    id: "zendesk",
    name: "Zendesk",
    clientIdEnv: "ZENDESK_OAUTH_CLIENT_ID",
    clientSecretEnv: "ZENDESK_OAUTH_CLIENT_SECRET",
    scopes: ["read", "write"],
    pkce: false,
    requiresSubdomain: true,
    authStyle: "body",
    authorizeUrl: (ctx) => {
      const sub = normalizeZendeskSubdomain(ctx.subdomain);
      if (!sub) throw new Error("Zendesk subdomain required");
      return `https://${sub}.zendesk.com/oauth/authorizations/new`;
    },
    tokenUrl: (ctx) => {
      const sub = normalizeZendeskSubdomain(ctx.subdomain);
      if (!sub) throw new Error("Zendesk subdomain required");
      return `https://${sub}.zendesk.com/oauth/tokens`;
    },
  },
  notion: {
    id: "notion",
    name: "Notion",
    clientIdEnv: "NOTION_OAUTH_CLIENT_ID",
    clientSecretEnv: "NOTION_OAUTH_CLIENT_SECRET",
    // Notion scopes are set on the integration, not requested in the URL.
    scopes: [],
    pkce: false,
    authStyle: "basic",
    authorizeUrl: () => "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: () => "https://api.notion.com/v1/oauth/token",
    extraAuthParams: { owner: "user" },
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    clientIdEnv: "SPOTIFY_OAUTH_CLIENT_ID",
    clientSecretEnv: "SPOTIFY_OAUTH_CLIENT_SECRET",
    scopes: [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "playlist-read-private",
    ],
    pkce: true,
    authStyle: "basic",
    authorizeUrl: () => "https://accounts.spotify.com/authorize",
    tokenUrl: () => "https://accounts.spotify.com/api/token",
  },
  todoist: {
    id: "todoist",
    name: "Todoist",
    clientIdEnv: "TODOIST_OAUTH_CLIENT_ID",
    clientSecretEnv: "TODOIST_OAUTH_CLIENT_SECRET",
    scopes: ["data:read_write"],
    pkce: false,
    authStyle: "body",
    authorizeUrl: () => "https://todoist.com/oauth/authorize",
    tokenUrl: () => "https://todoist.com/oauth/access_token",
  },
};

export function normalizeShop(shop?: string): string | null {
  if (!shop) return null;
  let s = shop.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  // Live Admin API egress is allowlisted to *.myshopify.com only (closes custom-host SSRF).
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(s)) return null;
  return s;
}

/** Zendesk subdomain only — no dots, no scheme, no zendesk.com suffix. */
export function normalizeZendeskSubdomain(subdomain?: string): string | null {
  if (!subdomain) return null;
  const sub = subdomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.zendesk\.com.*$/i, "")
    .replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(sub)) return null;
  return sub;
}

export function isOAuthConnector(id: string): id is OAuthConnectorId {
  return id in OAUTH_PROVIDERS;
}

export function listOAuthProviders(): OAuthProvider[] {
  return Object.values(OAUTH_PROVIDERS);
}

/** Resolve provider with email microsoft override for credentials. */
export function resolveProvider(
  id: OAuthConnectorId,
  ctx: OAuthStartContext = {},
): OAuthProvider {
  const base = OAUTH_PROVIDERS[id];
  if (id === "email" && ctx.emailProvider === "microsoft") {
    return {
      ...base,
      clientIdEnv: "MICROSOFT_OAUTH_CLIENT_ID",
      clientSecretEnv: "MICROSOFT_OAUTH_CLIENT_SECRET",
      scopes: [
        "offline_access",
        "openid",
        "profile",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/User.Read",
      ],
      extraAuthParams: undefined,
    };
  }
  return base;
}

/** Whether credentials exist for a connector (email checks Google and/or Microsoft). */
export function connectorOAuthConfigured(
  id: OAuthConnectorId,
  emailProvider: "google" | "microsoft" | "either" = "either",
): { configured: boolean; missingEnv: string[] } {
  if (id === "email") {
    const google = resolveProvider("email", { emailProvider: "google" });
    const ms = resolveProvider("email", { emailProvider: "microsoft" });
    const gOk = isOAuthConfigured(google);
    const mOk = isOAuthConfigured(ms);
    if (emailProvider === "google") {
      return {
        configured: gOk,
        missingEnv: gOk ? [] : [google.clientIdEnv, google.clientSecretEnv],
      };
    }
    if (emailProvider === "microsoft") {
      return {
        configured: mOk,
        missingEnv: mOk ? [] : [ms.clientIdEnv, ms.clientSecretEnv],
      };
    }
    return {
      configured: gOk || mOk,
      missingEnv: gOk || mOk ? [] : [
        google.clientIdEnv,
        google.clientSecretEnv,
        ms.clientIdEnv,
        ms.clientSecretEnv,
      ],
    };
  }
  const provider = resolveProvider(id);
  const ok = isOAuthConfigured(provider);
  return {
    configured: ok,
    missingEnv: ok ? [] : [provider.clientIdEnv, provider.clientSecretEnv],
  };
}
