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
    // Standard Anthropic / Model Context Protocol JSON-RPC 2.0 format
    const rpcPayload = {
      jsonrpc: "2.0",
      id: `mcp_${Date.now()}`,
      method: "tools/call",
      params: { name: call.tool, arguments: call.args },
    };

    const res = await safeFetch(`${endpoint}/tools/call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(rpcPayload),
    });

    if (!res.ok) {
      // Fallback: try raw tool call body if server is a REST MCP bridge
      const restRes = await safeFetch(`${endpoint}/tools/call`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify({ name: call.tool, arguments: call.args }),
      });
      if (!restRes.ok) throw new HttpResponseError(restRes.status, `MCP ${restRes.status}`);
      try {
        return (await restRes.json()) as Record<string, unknown>;
      } catch {
        return { ok: true, status: restRes.status };
      }
    }

    try {
      const json = (await res.json()) as Record<string, unknown>;
      // Extract result from JSON-RPC 2.0 response wrapper if present
      if (json.result && typeof json.result === "object") {
        return json.result as Record<string, unknown>;
      }
      return json;
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
