import { defaultBindingsForTools } from "@miai/presets";
import type { AgentState } from "@miai/runtime";
import { appendAudit, embedKeyFor, upsertWorkspaceAgent } from "@/lib/store";
import type { RentTier } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { toolsForConnectors } from "@/lib/connectors-catalog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return apiErrorFromRequest(req, 400, "Agent name is required");
  }

  const workspaceId = auth.workspaceId;
  const role = typeof body.role === "string" ? body.role.trim() : "Custom Assistant";
  const category = typeof body.category === "string" ? body.category : "sales";
  const tier: RentTier = body.tier === "enterprise" || body.tier === "pro" ? body.tier : "standard";
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : "claude-haiku-4-5";
  const accentColor = typeof body.accentColor === "string" && body.accentColor.startsWith("#") ? body.accentColor : "#0d9482";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  const market = typeof body.market === "string" && body.market.trim() ? body.market.trim() : "global";
  const tone = typeof body.tone === "string" && body.tone.trim() ? body.tone.trim() : "professional";
  const escalationContact = typeof body.escalationContact === "string" && body.escalationContact.trim()
    ? body.escalationContact.trim()
    : undefined;
  const webhookUrl = typeof body.webhookUrl === "string" && body.webhookUrl.trim()
    ? body.webhookUrl.trim()
    : undefined;
  const webhookSecret = typeof body.webhookSecret === "string" && body.webhookSecret.trim()
    ? body.webhookSecret.trim()
    : undefined;
  const mcpEndpoint = typeof body.mcpEndpoint === "string" && body.mcpEndpoint.trim()
    ? body.mcpEndpoint.trim()
    : undefined;
  const mcpToken = typeof body.mcpToken === "string" && body.mcpToken.trim()
    ? body.mcpToken.trim()
    : undefined;

  const rawConnectors: string[] = Array.isArray(body.connectors)
    ? body.connectors.filter((c): c is string => typeof c === "string" && Boolean(c.trim()))
    : [];
  const rawTools: string[] = Array.isArray(body.tools)
    ? body.tools.filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
    : [];

  const connectorTools = toolsForConnectors(rawConnectors);
  const tools = [...new Set([...rawTools, ...connectorTools])];
  if (webhookUrl && !tools.includes("webhook_dispatch")) tools.push("webhook_dispatch");
  if (mcpEndpoint && !tools.includes("mcp_tool_call")) tools.push("mcp_tool_call");

  const connectedConnectors = [...new Set([
    ...rawConnectors,
    ...(webhookUrl ? ["webhook"] : []),
    ...(mcpEndpoint ? ["mcp"] : []),
  ])];

  const state: AgentState = body.state === "configuring" ? "configuring" : "live";

  // Deterministic slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || "agent";
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const agentId = `custom-${slug}-${randomSuffix}`;

  const publicKey = embedKeyFor(workspaceId, agentId);
  const bindings = defaultBindingsForTools(tools);

  if (webhookUrl) {
    const existing = bindings.find((b) => b.tool === "webhook_dispatch");
    if (existing) {
      existing.config = { url: webhookUrl, ...(webhookSecret ? { secret: webhookSecret } : {}) };
    } else {
      bindings.push({
        tool: "webhook_dispatch",
        connector: "webhook",
        config: { url: webhookUrl, ...(webhookSecret ? { secret: webhookSecret } : {}) },
      });
    }
  }

  if (mcpEndpoint) {
    const existing = bindings.find((b) => b.tool === "mcp_tool_call");
    if (existing) {
      existing.config = { endpoint: mcpEndpoint, ...(mcpToken ? { token: mcpToken } : {}) };
    } else {
      bindings.push({
        tool: "mcp_tool_call",
        connector: "mcp",
        config: { endpoint: mcpEndpoint, ...(mcpToken ? { token: mcpToken } : {}) },
      });
    }
  }

  const customAgent = await upsertWorkspaceAgent(workspaceId, agentId, {
    agentId,
    name,
    summary: description,
    category,
    accentColor,
    isCustom: true,
    toolsList: tools,
    systemPrompt,
    state,
    model,
    knowledge: systemPrompt,
    tier,
    publicKey,
    bindings,
    connectedConnectors,
    market,
    tone,
    escalationContact,
    webhookUrl,
    webhookSecret,
    mcpEndpoint,
    mcpToken,
    rentedAt: new Date().toISOString(),
  });

  await appendAudit({
    workspaceId,
    agentId,
    type: "rent",
    detail: {
      action: "create_custom_agent",
      name,
      role,
      tier,
      publicKey,
      userId: auth.userId,
    },
  });

  return apiOk({
    ok: true,
    agent: customAgent,
    embedSnippet: `<script src="https://zaraai.digital/embed/v1/agent.js" data-key="${publicKey}" data-accent="${accentColor}" async></script>`,
  });
}
