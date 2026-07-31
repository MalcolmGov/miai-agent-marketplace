import { NextResponse } from "next/server";
import { RENT_USD, marketplaceCategory } from "@miai/agent-protocol";
import { getPreset } from "@miai/presets";
import { listConnectors } from "@miai/connectors";
import { getAgentPackage } from "@/lib/catalog";
import { getWorkspaceAgent } from "@/lib/store";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pkg = await getAgentPackage(id);
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const preset = getPreset(id);
  const rental = getWorkspaceAgent(WORKSPACE_ID, id);
  return NextResponse.json({
    package: pkg,
    marketplaceCategory: marketplaceCategory(pkg.manifest),
    rentUsd: RENT_USD[pkg.manifest.tier] ?? 349,
    preset: preset ?? null,
    pilot: Boolean(preset?.pilot),
    connectors: listConnectors().map((c) => ({
      id: c.id,
      name: c.name,
      phase: c.phase,
      description: c.description,
      recommended: c.recommended,
      auth: c.auth,
    })),
    rental: rental ?? null,
  });
}
