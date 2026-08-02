import type { ConnectorCall, ConnectorResult } from "../../types.js";
import type { StoredToken } from "../../oauth/tokens.js";
import { HttpResponseError, withRetry } from "../../retry.js";

async function postWebhook(url: string, secret: string, payload: unknown): Promise<Record<string, unknown>> {
  const { safeFetch } = await import("../../ssrf.js");
  const { signWebhookPayload } = await import("../../webhook-sig.js");
  return withRetry(async () => {
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const signature = secret ? signWebhookPayload(secret, timestamp, body) : "";
    const res = await safeFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature
          ? {
              "x-miai-signature": signature,
              "x-miai-timestamp": timestamp,
            }
          : {}),
      },
      body,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      throw new Error("Webhook redirects are not followed (SSRF protection)");
    }
    if (!res.ok) throw new HttpResponseError(res.status, `Webhook ${res.status}`);
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return { ok: true, status: res.status };
    }
  });
}

export async function executeWebhook(
  call: ConnectorCall,
  keyTok: StoredToken | null,
  config: Record<string, string>,
): Promise<ConnectorResult> {
  const url = keyTok?.meta.url || config.url;
  const secret = keyTok?.meta.secret || keyTok?.accessToken || config.secret || "";
  if (!url) throw new Error("Webhook URL missing");
  const data = await postWebhook(url, secret === "configured" ? config.secret ?? "" : secret, {
    tool: call.tool,
    args: call.args,
    agentId: call.agentId,
    workspaceId: call.workspaceId,
  });
  return {
    ok: true,
    data: { ...data, live: true, provider: "webhook" },
    connector: "webhook",
    stubbed: false,
  };
}
