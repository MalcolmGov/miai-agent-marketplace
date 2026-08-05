import { NextResponse } from "next/server";
import { executeConnector, type ToolBinding } from "@miai/connectors";
import { defaultBindingsForTools, getPreset } from "@miai/presets";
import { getAgentPackage } from "@/lib/catalog";
import { getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { assertProofHarness } from "@/lib/proof-harness";

export const dynamic = "force-dynamic";

type Body = {
  workspaceId?: string;
  agentId?: string;
  tool?: string;
  args?: Record<string, unknown>;
  mode?: "live" | "sandbox";
  correlationId?: string;
};

function isLiveResult(result: {
  ok?: boolean;
  stubbed?: boolean;
  data?: Record<string, unknown>;
}): boolean {
  if (result.stubbed === true) return false;
  const data = result.data || {};
  if (data.live === true) return true;
  if (data.source === "sandbox_stub") return false;
  if (typeof data._note === "string" && /not OAuth-connected/i.test(data._note)) {
    return false;
  }
  // Vendor error that reached the API still proves the OAuth path.
  if (
    typeof data.error === "string" &&
    data.error.length > 0 &&
    !/not OAuth-connected|sandbox_stub|demo token/i.test(data.error)
  ) {
    return true;
  }
  // Successful non-stub OAuth/API-key execution.
  if (result.ok === true && result.stubbed === false) return true;
  return false;
}

/**
 * Scripted tool execution — bypasses the LLM.
 * POST /api/proof/tool
 */
export async function POST(req: Request) {
  const gate = assertProofHarness(req);
  if (gate) return gate;

  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const agentId = (body.agentId || "").trim();
  const tool = (body.tool || "").trim();
  if (!agentId || !tool) {
    return NextResponse.json({ error: "agentId_and_tool_required" }, { status: 400 });
  }

  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : body.workspaceId || auth.workspaceId;

  const mode = body.mode === "sandbox" ? "sandbox" : "live";
  const corr =
    body.correlationId ||
    `corr_proof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  const pkg = await getAgentPackage(agentId);
  if (!pkg) {
    return NextResponse.json({ error: "unknown_agent" }, { status: 404 });
  }

  const preset = getPreset(agentId);
  const stored = await getWorkspaceAgent(workspaceId, agentId);
  const bindings: ToolBinding[] =
    stored?.bindings?.length
      ? (stored.bindings as ToolBinding[])
      : preset?.bindings ?? defaultBindingsForTools(pkg.tools.map((t) => t.name));

  const binding = bindings.find((b) => b.tool === tool);
  if (!binding) {
    return NextResponse.json(
      {
        ok: false,
        error: "tool_not_bound",
        agentId,
        tool,
        available: bindings.map((b) => b.tool),
      },
      { status: 400 },
    );
  }

  if (!stored) {
    await upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      state: "live",
      model: pkg.manifest.model.primary,
      knowledge: pkg.knowledge,
      bindings,
      rentedAt: new Date().toISOString(),
    });
  }

  const result = await executeConnector({
    workspaceId,
    agentId,
    tool,
    args: body.args || {},
    binding,
    mode,
  });

  const live = isLiveResult(result);
  const dataErr =
    typeof result.data?.error === "string" ? String(result.data.error) : undefined;

  return NextResponse.json({
    ok: (result.ok || live) && !dataErr?.includes("not OAuth-connected"),
    live,
    stubbed: result.stubbed,
    connector: binding.connector,
    tool,
    agentId,
    workspaceId,
    correlationId: corr,
    result,
  });
}
