import { NextResponse } from "next/server";
import { runTurn } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import { getComposedKnowledge } from "@/lib/knowledge";
import { appendAudit, getWorkspaceAgent, resolveEmbedKey, upsertWorkspaceAgent } from "@/lib/store";

/** The widget runs on customers' websites, so this endpoint must answer cross-origin.
 *  The embed key identifies (and is scoped to) the tenant agent; it is public by design. */
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    key: string;
    message: string;
    sessionId?: string;
  };
  const resolved = resolveEmbedKey(body.key);
  if (!resolved)
    return NextResponse.json({ error: "Invalid key" }, { status: 401, headers: CORS_HEADERS });

  const { workspaceId, agentId } = resolved;
  const pkg = await getAgentPackage(agentId);
  if (!pkg)
    return NextResponse.json({ error: "Agent missing" }, { status: 404, headers: CORS_HEADERS });

  let rental = getWorkspaceAgent(workspaceId, agentId);
  if (!rental) {
    rental = upsertWorkspaceAgent(workspaceId, agentId, {
      agentId,
      state: "live",
      publicKey: body.key,
      knowledge: pkg.knowledge,
      model: pkg.manifest.model.primary,
    });
  }

  const knowledgeOverride = await getComposedKnowledge(
    workspaceId,
    agentId,
    rental.knowledge || pkg.knowledge,
  );

  const result = await runTurn(
    {
      workspaceId,
      agentId,
      pkg,
      messages: rental.messages,
      userMessage: body.message,
      model: rental.model,
      mode: rental.state === "selected" || rental.state === "configuring" ? "sandbox" : "live",
      knowledgeOverride,
      bindings: rental.bindings,
      state: rental.state,
    },
    { wallet: createWalletAdapter() },
  );

  upsertWorkspaceAgent(workspaceId, agentId, {
    agentId,
    messages: result.messages,
    state: result.paused ? "paused_no_tokens" : "live",
  });

  appendAudit({
    workspaceId,
    agentId,
    type: "embed_turn",
    detail: { tokensDebited: result.tokensDebited, paused: result.paused },
  });

  return NextResponse.json(
    {
      reply: result.assistantMessage,
      paused: result.paused,
      balance: result.balance,
    },
    { headers: CORS_HEADERS },
  );
}
