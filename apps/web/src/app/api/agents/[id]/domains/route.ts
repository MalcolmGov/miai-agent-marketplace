import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { getWorkspaceAgent, setEmbedApprovedDomains } from "@/lib/store";
import { agentDomainsBodySchema, formatZodError } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

/**
 * Set (or clear) the approved-domains lock for an embedded agent.
 *
 * The embed key is public by design (it sits in the customer's page HTML), so anyone can lift it
 * and drive the agent from a script — and every turn bills this workspace's wallet. When domains
 * are set, the embed/app channel only serves requests whose Origin/Referer is one of them, which
 * a non-browser client cannot satisfy. Empty = unlocked (the pre-existing, backward-compatible
 * behaviour). Owner/admin only; the workspace is pinned to the verified identity under OIDC.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = agentDomainsBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", detail: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (parsed.data.workspaceId ?? auth.workspaceId);
  if (!(await getWorkspaceAgent(workspaceId, id))) {
    return Response.json({ error: "Agent not activated in this workspace" }, { status: 404 });
  }

  const rental = await setEmbedApprovedDomains(workspaceId, id, parsed.data.domains);
  if (!rental) {
    return Response.json({ error: "Agent not activated in this workspace" }, { status: 404 });
  }
  return Response.json({ ok: true, approvedDomains: rental.approvedDomains ?? [] });
}
