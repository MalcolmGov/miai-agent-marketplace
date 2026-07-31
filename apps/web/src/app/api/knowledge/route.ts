import { NextResponse } from "next/server";
import {
  composeKnowledge,
  listKnowledgeSources,
} from "@/lib/knowledge";
import { getWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const url = new URL(req.url);
  const agentId = url.searchParams.get("agentId");
  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : (url.searchParams.get("workspaceId") ?? auth.workspaceId);
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const sources = await listKnowledgeSources(workspaceId, agentId);
  const rental = await getWorkspaceAgent(workspaceId, agentId);
  const base = rental?.knowledge ?? "";
  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      url: s.url,
      filename: s.filename,
      status: s.status,
      error: s.error,
      chars: s.chars,
      createdAt: s.createdAt,
      preview: s.content.slice(0, 240),
    })),
    composedChars: composeKnowledge(base, sources).length,
    baseChars: base.length,
  });
}
