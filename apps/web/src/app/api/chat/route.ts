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
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { formatZodError, studioChatBodySchema } from "@/lib/api-schemas";

export async function POST(req: Request) {
  const started = Date.now();
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return apiErrorFromRequest(req, 400, "Invalid JSON body");
    }

    const parsed = studioChatBodySchema.safeParse(raw);
    if (!parsed.success) {
      return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
    }
    const body = parsed.data;

    const correlationId = correlationFromRequest(req, body.correlationId);
    const sessionId = body.sessionId?.trim() || `studio_${auth.userId}_${body.agentId}`;
    const workspaceId =
      auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
    const pkg = await getAgentPackage(body.agentId);
    if (!pkg) return apiErrorFromRequest(req, 404, "Unknown agent");

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
      return apiOk({ ok: true, cleared: true, messages: [], correlationId });
    }

    if (!body.message?.trim()) {
      return apiErrorFromRequest(req, 400, "message required");
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

    return apiOk({
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
