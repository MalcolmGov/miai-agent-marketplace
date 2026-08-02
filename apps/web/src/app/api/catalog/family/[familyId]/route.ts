import { NextResponse } from "next/server";
import { getAgentPackage, listFamilies } from "@/lib/catalog";
import { buildFamilyCapabilities } from "@/lib/family-capabilities";

export const dynamic = "force-dynamic";

/**
 * Customer-facing capability brief for Learn more modals.
 * GET /api/catalog/family/:familyId?market=us
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ familyId: string }> },
) {
  const { familyId } = await ctx.params;
  const id = decodeURIComponent(familyId || "").trim();
  if (!id || id.length > 120) {
    return NextResponse.json({ error: "Invalid family id" }, { status: 400 });
  }

  const market = new URL(req.url).searchParams.get("market");
  const preferred =
    market && market !== "all" ? (market === "za" ? "africa" : market) : null;

  const families = await listFamilies(preferred);
  const family = families.find((f) => f.id === id);
  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }

  const agentId =
    (preferred && family.markets[preferred]) || family.defaultAgentId;
  const pkg = await getAgentPackage(agentId);
  if (!pkg) {
    return NextResponse.json({ error: "Agent pack not found" }, { status: 404 });
  }

  const capabilities = buildFamilyCapabilities(pkg, family.id);
  return NextResponse.json({
    family: {
      id: family.id,
      name: family.name,
      tier: family.tier,
      marketplaceCategory: family.marketplaceCategory,
      audience: family.audience,
      markets: family.markets,
      packs: family.packs,
      hasZa: family.hasZa,
      defaultAgentId: family.defaultAgentId,
    },
    capabilities,
  });
}
