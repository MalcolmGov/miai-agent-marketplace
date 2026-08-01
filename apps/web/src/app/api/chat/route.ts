import { NextResponse } from "next/server";
import { runTurn, type AgentState } from "@miai/runtime";
import { createWalletAdapter } from "@miai/wallet-adapter";
import { getAgentPackage } from "@/lib/catalog";
import {
  isChatLanguage,
  replyLanguageSystemAppend,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import { getComposedKnowledge } from "@/lib/knowledge";
import { appendAudit, getWorkspaceAgent, upsertWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { trackEvent, trackException } from "@/lib/telemetry";
import { correlationFromRequest, recordChatTurn } from "@/lib/traceability";

export async function POST(req: Request) {
  const started = Date.now();
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  try {
    const body = (await req.json()) as {
      agentId: string;
      message?: string;
      workspaceId?: string;
      mode?: "sandbox" | "live";
      clear?: boolean;
      /** BCP-47-ish chat reply language (en, es, fr, de, it, zh, hi, sw). */
      replyLanguage?: string;
      correlationId?: string;
      sessionId?: string;
    };
    const correlationId = correlationFromRequest(req, body.correlationId);
    const sessionId = body.sessionId?.trim() || `studio_${auth.userId}_${body.agentId}`;
    const workspaceId =
      auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
    const pkg = await getAgentPackage(body.agentId);
    if (!pkg) return NextResponse.json({ error: "Unknown agent" }, { status: 404 });

    // Reset conversation history (UI + server-persisted turns / pending workflows).
    if (body.clear) {
      const rental = await getWorkspaceAgent(workspaceId, body.agentId);
      if (rental) {
        await upsertWorkspaceAgent(workspaceId, body.agentId, {
          agentId: body.agentId,
          messages: [],
        });
      }
      await appendAudit({
        workspaceId,
        agentId: body.agentId,
        type: "agent_turn",
        correlationId,
        userId: auth.userId,
        sessionId,
        channel: "studio",
        detail: { action: "clear_chat", correlationId, sessionId, userId: auth.userId },
      });
      return NextResponse.json({ ok: true, cleared: true, messages: [], correlationId });
    }

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

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
    /** Free try-before-buy: sandbox while not yet rented. */
    const freeTry = mode === "sandbox" && rental.state === "selected";
    const knowledgeOverride = await getComposedKnowledge(
      workspaceId,
      body.agentId,
      rental.knowledge || pkg.knowledge,
    );
    const replyLanguage: ChatLanguageCode = isChatLanguage(body.replyLanguage)
      ? body.replyLanguage
      : "en";

    const result = await runTurn(
      {
        workspaceId,
        agentId: body.agentId,
        pkg,
        messages: rental.messages,
        userMessage: body.message.trim(),
        model: rental.model,
        mode,
        knowledgeOverride,
        bindings: rental.bindings,
        state: rental.state as AgentState,
        systemAppend: replyLanguageSystemAppend(replyLanguage),
        replyLanguage,
      },
      { wallet: createWalletAdapter(), skipDebit: freeTry },
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

    await recordChatTurn({
      correlationId,
      workspaceId,
      agentId: body.agentId,
      channel: "studio",
      sessionId,
      userId: auth.userId,
      userMessage: body.message.trim(),
      assistantMessage: result.assistantMessage,
      toolCalls: result.toolCalls,
      tokensDebited: result.tokensDebited,
      paused: result.paused,
      model: rental.model,
      mode,
      replyLanguage,
      auditType: result.paused ? "paused_no_tokens" : "agent_turn",
      extraDetail: {
        balance: result.balance,
        durationMs: Date.now() - started,
        freeTry,
      },
    });

    trackEvent("miai.chat.turn", {
      agentId: body.agentId,
      mode,
      replyLanguage,
      paused: result.paused,
      tokensDebited: result.tokensDebited,
      freeTry,
      toolCount: result.toolCalls.length,
      durationMs: Date.now() - started,
      correlationId,
    });

    return NextResponse.json({
      assistantMessage: result.assistantMessage,
      toolCalls: result.toolCalls,
      tokensDebited: result.tokensDebited,
      balance: result.balance,
      paused: result.paused,
      state: nextState,
      workflow: result.workflow ?? null,
      replyLanguage,
      messages: result.messages.filter((m) => m.role !== "tool"),
      correlationId,
      sessionId,
      freeTry,
    });
  } catch (err) {
    trackException(err, { route: "api/chat", durationMs: Date.now() - started });
    throw err;
  }
}
