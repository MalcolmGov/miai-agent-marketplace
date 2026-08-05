/**
 * Read-only health probes for connected OAuth providers.
 * Confirms the stored token still works — no writes / no side-effect messages.
 */
import { getValidAccessToken } from "./flow.js";

export type ProbeResult = {
  ok: boolean;
  connector: string;
  detail?: string;
  account?: string;
  error?: string;
};

async function slackProbe(token: string): Promise<Omit<ProbeResult, "connector">> {
  const res = await fetch("https://slack.com/api/auth.test", {
    headers: { authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    user?: string;
    team?: string;
  };
  if (!json.ok) {
    return { ok: false, error: json.error || `slack_${res.status}` };
  }
  return {
    ok: true,
    detail: "auth.test",
    account: [json.user, json.team].filter(Boolean).join("@") || undefined,
  };
}

async function googleCalendarProbe(token: string): Promise<Omit<ProbeResult, "connector">> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1",
    { headers: { authorization: `Bearer ${token}` } },
  );
  const json = (await res.json()) as {
    items?: { summary?: string; id?: string }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `calendar_${res.status}` };
  }
  const cal = json.items?.[0];
  return {
    ok: true,
    detail: "calendarList",
    account: cal?.summary || cal?.id || "primary",
  };
}

async function hubspotProbe(token: string): Promise<Omit<ProbeResult, "connector">> {
  const res = await fetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    const r2 = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r2.ok) {
      return { ok: false, error: `hubspot_${r2.status}` };
    }
    return { ok: true, detail: "crm/contacts", account: "hubspot" };
  }
  const json = (await res.json()) as {
    portalId?: number;
    accountType?: string;
    message?: string;
  };
  if (!res.ok) {
    return { ok: false, error: json.message || `hubspot_${res.status}` };
  }
  return {
    ok: true,
    detail: "account-info",
    account: json.portalId != null ? `portal ${json.portalId}` : json.accountType,
  };
}

async function gmailProbe(token: string): Promise<Omit<ProbeResult, "connector">> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as {
    emailAddress?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    return { ok: false, error: json.error?.message || `gmail_${res.status}` };
  }
  return {
    ok: true,
    detail: "users.profile",
    account: json.emailAddress,
  };
}

const PROBERS: Record<string, (token: string) => Promise<Omit<ProbeResult, "connector">>> = {
  slack: slackProbe,
  google_calendar: googleCalendarProbe,
  hubspot: hubspotProbe,
  email: gmailProbe,
};

/** Probe a connected OAuth connector for a workspace (read-only). */
export async function probeOAuthConnector(
  workspaceId: string,
  connectorId: string,
): Promise<ProbeResult> {
  const probe = PROBERS[connectorId];
  if (!probe) {
    return { ok: false, connector: connectorId, error: "probe_not_supported" };
  }
  const stored = await getValidAccessToken(workspaceId, connectorId);
  if (!stored?.accessToken) {
    return { ok: false, connector: connectorId, error: "not_connected" };
  }
  try {
    const out = await probe(stored.accessToken);
    return { connector: connectorId, ...out };
  } catch (e) {
    return {
      ok: false,
      connector: connectorId,
      error: e instanceof Error ? e.message : "probe_failed",
    };
  }
}

export function probeSupportedConnectors(): string[] {
  return Object.keys(PROBERS);
}
