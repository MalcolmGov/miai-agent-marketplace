/**
 * Lightweight telemetry sink.
 * - Always emits structured console lines (Container Apps → Log Analytics).
 * - When APPLICATIONINSIGHTS_CONNECTION_STRING is set, also POSTs envelopes
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
  const ingestion = (
    parts.IngestionEndpoint ||
    parts.ingestionendpoint ||
    "https://dc.services.visualstudio.com/"
  ).replace(/\/?$/, "/");
  return { iKey, ingestion };
}

export function telemetryMode(): "appinsights" | "console" {
  return connectionString() ? "appinsights" : "console";
}

function roleTags() {
  return {
    "ai.cloud.role": process.env.WEBSITE_SITE_NAME || "miai-agent-marketplace",
    "ai.cloud.roleInstance": process.env.HOSTNAME || "web",
  };
}

function consoleLine(level: string, name: string, properties?: TelemetryProps) {
  const line = {
    level,
    event: name,
    ts: new Date().toISOString(),
    ...Object.fromEntries(
      Object.entries(properties ?? {}).filter(([, v]) => v !== undefined && v !== null),
    ),
  };
  if (level === "error") console.error(JSON.stringify(line));
  else console.log(JSON.stringify(line));
}

async function postEnvelopes(envelopes: unknown[]): Promise<void> {
  const cs = connectionString();
  if (!cs || envelopes.length === 0) return;
  const parsed = parseConnectionString(cs);
  if (!parsed) return;
  try {
    await fetch(`${parsed.ingestion}v2/track`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(envelopes),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // swallow — never fail the product path for telemetry
  }
}

function propsToStrings(properties?: TelemetryProps): Record<string, string> {
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(properties ?? {})) {
    if (v === undefined || v === null) continue;
    props[k] = String(v);
  }
  return props;
}

/** Fire-and-forget custom event. */
export function trackEvent(name: string, properties?: TelemetryProps): void {
  consoleLine("info", name, properties);
  const cs = connectionString();
  if (!cs) return;
  const parsed = parseConnectionString(cs);
  if (!parsed) return;
  void postEnvelopes([
    {
      name: `Microsoft.ApplicationInsights.${parsed.iKey}.Event`,
      time: new Date().toISOString(),
      iKey: parsed.iKey,
      tags: roleTags(),
      data: {
        baseType: "EventData",
        baseData: { ver: 2, name, properties: propsToStrings(properties) },
      },
    },
  ]);
}

/** Exception envelope for failures (chat, oauth, wallet). */
export function trackException(
  error: unknown,
  properties?: TelemetryProps,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const typeName = error instanceof Error ? error.name : "Error";
  const stack = error instanceof Error ? error.stack : undefined;
  consoleLine("error", "exception", { message, typeName, ...properties });

  const cs = connectionString();
  if (!cs) return;
  const parsed = parseConnectionString(cs);
  if (!parsed) return;

  void postEnvelopes([
    {
      name: `Microsoft.ApplicationInsights.${parsed.iKey}.Exception`,
      time: new Date().toISOString(),
      iKey: parsed.iKey,
      tags: roleTags(),
      data: {
        baseType: "ExceptionData",
        baseData: {
          ver: 2,
          exceptions: [
            {
              typeName,
              message,
              hasFullStack: Boolean(stack),
              stack,
            },
          ],
          properties: propsToStrings(properties),
        },
      },
    },
  ]);
}

/** Outbound dependency (wallet, model gateway, OAuth token exchange). */
export function trackDependency(opts: {
  name: string;
  type?: string;
  target?: string;
  durationMs: number;
  success: boolean;
  resultCode?: string | number;
  properties?: TelemetryProps;
}): void {
  consoleLine(opts.success ? "info" : "error", `dependency.${opts.name}`, {
    target: opts.target,
    durationMs: opts.durationMs,
    success: opts.success,
    resultCode: opts.resultCode,
    ...opts.properties,
  });

  const cs = connectionString();
  if (!cs) return;
  const parsed = parseConnectionString(cs);
  if (!parsed) return;

  void postEnvelopes([
    {
      name: `Microsoft.ApplicationInsights.${parsed.iKey}.RemoteDependency`,
      time: new Date().toISOString(),
      iKey: parsed.iKey,
      tags: roleTags(),
      data: {
        baseType: "RemoteDependencyData",
        baseData: {
          ver: 2,
          name: opts.name,
          id: `dep_${Date.now().toString(36)}`,
          data: opts.target ?? opts.name,
          type: opts.type ?? "HTTP",
          target: opts.target,
          duration: Math.max(0, Math.round(opts.durationMs)),
          success: opts.success,
          resultCode: opts.resultCode != null ? String(opts.resultCode) : undefined,
          properties: propsToStrings(opts.properties),
        },
      },
    },
  ]);
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
