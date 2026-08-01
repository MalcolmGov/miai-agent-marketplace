import { NextResponse } from "next/server";
import { runTurn, type AgentState } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import { getComposedKnowledge } from "@/lib/knowledge";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const body = (await req.json()) as {
    agentId: string;
    message: string;
    workspaceId?: string;
    mode?: "sandbox" | "live";
  };
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const pkg = await getAgentPackage(body.agentId);
  if (!pkg) return NextResponse.json({ error: "Unknown agent" }, { status: 404 });

  let rental = await getWorkspaceAgent(workspaceId, body.agentId);
  if (!rental) {
    rental = await upsertWorkspaceAgent(workspaceId, body.agentId, {
      agentId: body.agentId,
      state: "selected",
      knowledge: pkg.knowledge,
      model: pkg.manifest.model.primary,
    });
  }

  const mode = body.mode ?? (rental.state === "live" ? "live" : "sandbox");
  const knowledgeOverride = await getComposedKnowledge(
    workspaceId,
    body.agentId,
    rental.knowledge || pkg.knowledge,
  );

  const result = await runTurn(
    {
      workspaceId,
      agentId: body.agentId,
      pkg,
      messages: rental.messages,
      userMessage: body.message,
      model: rental.model,
      mode,
      knowledgeOverride,
      bindings: rental.bindings,
      state: rental.state as AgentState,
    },
    { wallet: createWalletAdapter() },
  );

  const nextState = result.paused
    ? "paused_no_tokens"
    : rental.state === "rented" || rental.state === "live"
      ? "live"
      : rental.state;

  await upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    messages: result.messages,
    state: nextState as AgentState,
  });

  await appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: result.paused ? "paused_no_tokens" : "agent_turn",
    detail: {
      tokensDebited: result.tokensDebited,
      balance: result.balance,
      tools: result.toolCalls.map((t) => t.name),
      mode,
    },
  });

  for (const tc of result.toolCalls) {
    if ((tc.result as { error?: string })?.error) {
      await appendAudit({
        workspaceId,
        agentId: body.agentId,
        type: "tool_error",
        detail: { tool: tc.name, result: tc.result },
      });
    }
  }

  return NextResponse.json({
    assistantMessage: result.assistantMessage,
    toolCalls: result.toolCalls,
    tokensDebited: result.tokensDebited,
    balance: result.balance,
    paused: result.paused,
    state: nextState,
    workflow: result.workflow ?? null,
    messages: result.messages.filter((m) => m.role !== "tool"),
  });
}
