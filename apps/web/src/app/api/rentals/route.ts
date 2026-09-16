import { NextResponse } from "next/server";
import { getAgentPackage } from "@/lib/catalog";
import { agentReadiness } from "@/lib/connector-preflight";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { listWorkspaceAgents } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const workspaceId = auth.workspaceId;
  const rentals = await listWorkspaceAgents(workspaceId);
  const items = await Promise.all(
    rentals
      .filter((r) => r.state !== "selected")
      .map(async (r) => {
        const pkg = await getAgentPackage(r.agentId);
        // P0-6: recompute connector readiness per rental (catches tokens revoked/expired AFTER rent,
        // which the rent-time check can't). Labeled `missing` drives a "needs setup" badge.
        const preflight = pkg ? await agentReadiness(workspaceId, pkg, r.bindings) : null;
        return {
          agentId: r.agentId,
          name: pkg?.manifest.name ?? r.name ?? r.agentId,
          summary: pkg?.manifest.summary ?? r.summary ?? "",
          state: r.state,
          tier: r.tier,
          market: pkg?.manifest.market ?? null,
          connectedConnectors: r.connectedConnectors ?? [],
          rentedAt: r.rentedAt ?? null,
          publicKey: r.publicKey,
          embedRevoked: r.embedRevoked === true,
          isCustom: r.isCustom ?? false,
          accentColor: r.accentColor,
          readiness: preflight
            ? { ready: preflight.readiness.ready, missing: preflight.connectorNotice?.missing ?? [] }
            : { ready: true, missing: [] },
        };
      }),
  );

  items.sort((a, b) => {
    const at = a.rentedAt ? Date.parse(a.rentedAt) : 0;
    const bt = b.rentedAt ? Date.parse(b.rentedAt) : 0;
    return bt - at;
  });

  return NextResponse.json({ workspaceId, count: items.length, items });
}
