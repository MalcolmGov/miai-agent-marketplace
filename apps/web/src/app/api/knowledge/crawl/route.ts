import { NextResponse } from "next/server";
import { addKnowledgeSource, updateKnowledgeSource } from "@/lib/knowledge";
import { crawlSite } from "@/lib/ingest";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { rateLimit, requireRole } from "@/lib/security";
import { knowledgeCrawlBodySchema, parseJsonBody } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  const limited = await rateLimit(`knowledge-crawl:${auth.workspaceId}:${auth.userId}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many crawl requests — retry shortly" },
      { status: 429, headers: { "retry-after": String(limited.retryAfterSec) } },
    );
  }

  const parsed = await parseJsonBody(req, knowledgeCrawlBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const agentId = body.agentId;
  const url = body.url.trim();

  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const maxPages = Math.min(Math.max(Number(body.maxPages ?? 5), 1), 8);

  const pending = await addKnowledgeSource({
    workspaceId,
    agentId,
    type: "website",
    title: url,
    url,
    content: "",
    status: "processing",
  });

  try {
    const { pages, errors } = await crawlSite(url, { maxPages });
    if (!pages.length) {
      await updateKnowledgeSource(workspaceId, agentId, pending.id, {
        status: "error",
        error: errors[0] ?? "No pages crawled",
        content: "",
      });
      return NextResponse.json(
        { error: errors[0] ?? "Could not read that website", errors },
        { status: 502 },
      );
    }

    const content = pages
      .map((p) => `### ${p.title}\nURL: ${p.url}\n\n${p.text}`)
      .join("\n\n---\n\n")
      .slice(0, 100_000);

    const source = await updateKnowledgeSource(workspaceId, agentId, pending.id, {
      status: "ready",
      title: pages[0].title || url,
      url: pages[0].url,
      content,
      error: errors.length ? errors.slice(0, 3).join("; ") : undefined,
    });

    await appendAudit({
      workspaceId,
      agentId,
      type: "knowledge_ingest",
      detail: {
        sourceId: pending.id,
        kind: "website",
        url,
        pages: pages.length,
        chars: content.length,
        errors,
      },
    });

    return NextResponse.json({
      ok: true,
      source: {
        id: source?.id,
        type: "website",
        title: source?.title,
        url: source?.url,
        status: source?.status,
        chars: source?.chars,
        pages: pages.length,
        errors,
      },
    });
  } catch (e) {
    await updateKnowledgeSource(workspaceId, agentId, pending.id, {
      status: "error",
      error: e instanceof Error ? e.message : "Crawl failed",
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Crawl failed" },
      { status: 502 },
    );
  }
}
