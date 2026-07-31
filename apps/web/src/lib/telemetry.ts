/**
 * Lightweight telemetry sink.
 * - Always emits structured console lines (Container Apps → Log Analytics).
 * - When APPLICATIONINSIGHTS_CONNECTION_STRING is set, also POSTs custom events
 *   to the App Insights ingestion endpoint (no SDK dependency).
 */

export type TelemetryProps = Record<string, string | number | boolean | undefined | null>;

function connectionString(): string | undefined {
  return (
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
    process.env.APPINSIGHTS_CONNECTION_STRING ||
    undefined
  );
}

function parseConnectionString(cs: string): { iKey: string; ingestion: string } | null {
  const parts = Object.fromEntries(
    cs.split(";").map((p) => {
      const i = p.indexOf("=");
      return i > 0 ? [p.slice(0, i), p.slice(i + 1)] : [p, ""];
    }),
  ) as Record<string, string>;
  const iKey = parts.InstrumentationKey || parts.instrumentationkey;
  if (!iKey) return null;
  const ingestion = (parts.IngestionEndpoint || parts.ingestionendpoint || "https://dc.services.visualstudio.com/").replace(
    /\/?$/,
    "/",
  );
  return { iKey, ingestion };
}

export function telemetryMode(): "appinsights" | "console" {
  return connectionString() ? "appinsights" : "console";
}

function consoleLine(name: string, properties?: TelemetryProps) {
  const line = {
    level: "info",
    event: name,
    ts: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(properties ?? {}).filter(([, v]) => v !== undefined && v !== null),
    ),
  };
  console.log(JSON.stringify(line));
}

async function postAppInsights(name: string, properties?: TelemetryProps): Promise<void> {
  const cs = connectionString();
  if (!cs) return;
  const parsed = parseConnectionString(cs);
  if (!parsed) return;

  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(properties ?? {})) {
    if (v === undefined || v === null) continue;
    props[k] = String(v);
  }

  const envelope = {
    name: `Microsoft.ApplicationInsights.${parsed.iKey}.Event`,
    time: new Date().toISOString(),
    iKey: parsed.iKey,
    tags: {
      "ai.cloud.role": process.env.WEBSITE_SITE_NAME || "miai-agent-marketplace",
      "ai.cloud.roleInstance": process.env.HOSTNAME || "web",
    },
    data: {
      baseType: "EventData",
      baseData: {
        ver: 2,
        name,
        properties: props,
      },
    },
  };

  try {
    await fetch(`${parsed.ingestion}v2/track`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([envelope]),
      // best-effort; do not block request path on telemetry failure
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // swallow — never fail the product path for telemetry
  }
}

/** Fire-and-forget custom event. */
export function trackEvent(name: string, properties?: TelemetryProps): void {
  consoleLine(name, properties);
  if (connectionString()) {
    void postAppInsights(name, properties);
  }
}

/** Map an audit row into a telemetry event. */
export function trackAudit(event: {
  id: string;
  at: string;
  workspaceId: string;
  agentId?: string;
  type: string;
  detail?: Record<string, unknown>;
}): void {
  trackEvent(`miai.audit.${event.type}`, {
    auditId: event.id,
    at: event.at,
    workspaceId: event.workspaceId,
    agentId: event.agentId,
    detailKeys: event.detail ? Object.keys(event.detail).join(",") : "",
  });
}
