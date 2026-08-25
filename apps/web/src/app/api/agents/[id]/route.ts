import { NextResponse } from "next/server";
import { RENT_USD, marketplaceCategory } from "@miai/agent-protocol";
import { getPreset } from "@miai/presets";
import { listConnectors } from "@miai/connectors";
import { getAgentPackage } from "@/lib/catalog";
import { getWorkspaceAgent } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { isSandbox, redactAgentPackage } from "@/lib/sandbox";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const { id } = await ctx.params;
  const pkg = await getAgentPackage(id);
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const q = new URL(req.url).searchParams.get("workspaceId");
  const workspaceId = auth.mode === "oidc" ? auth.workspaceId : (q ?? auth.workspaceId);
  const preset = getPreset(id);
  const rental = await getWorkspaceAgent(workspaceId, id);
  return NextResponse.json({
    package: isSandbox() ? redactAgentPackage(pkg) : pkg,
    marketplaceCategory: marketplaceCategory(pkg.manifest),
    rentUsd: RENT_USD[pkg.manifest.tier] ?? 349,
    preset: preset ?? null,
    pilot: false,
    connectors: listConnectors().map((c) => ({
      id: c.id,
      name: c.name,
      phase: c.phase,
      description: c.description,
      recommended: c.recommended,
      auth: c.auth,
    })),
    rental: rental ?? null,
    workspaceId,
  });
}
