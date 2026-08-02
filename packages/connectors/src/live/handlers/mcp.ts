import type { ConnectorCall, ConnectorResult } from "../../types.js";
import type { StoredToken } from "../../oauth/tokens.js";
import { HttpResponseError, withRetry } from "../../retry.js";

export async function executeMcp(
  call: ConnectorCall,
  keyTok: StoredToken | null,
  config: Record<string, string>,
): Promise<ConnectorResult> {
  const endpoint = String(keyTok?.meta.endpoint || config.endpoint || "").replace(/\/$/, "");
  const token = keyTok?.meta.token || keyTok?.accessToken || config.token || "";
  if (!endpoint) throw new Error("MCP endpoint missing");
  const bearer = token === "configured" ? config.token ?? "" : token;
  const { safeFetch } = await import("../../ssrf.js");
  const data = await withRetry(async () => {
    const res = await safeFetch(`${endpoint}/tools/call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({ name: call.tool, arguments: call.args }),
    });
    if (!res.ok) throw new HttpResponseError(res.status, `MCP ${res.status}`);
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      return { ok: true, status: res.status };
    }
  });
  return {
    ok: true,
    data: { ...data, live: true, provider: "mcp" },
    connector: "mcp",
    stubbed: false,
  };
}
