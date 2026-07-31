import { NextResponse } from "next/server";
import { listCatalog, listFamilies, listMarketPacks } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const market = searchParams.get("market");
  const category = searchParams.get("category");
  const view = searchParams.get("view") ?? "families";
  const packs = await listMarketPacks();
  const allAgents = await listCatalog();
  const totalAgents = allAgents.length;

  if (view === "agents") {
    let items = allAgents;
    if (market && market !== "all") {
      const m = market === "za" ? "africa" : market;
      items = items.filter((i) => i.market === m);
    }
    if (category && category !== "all")
      items = items.filter((i) => i.marketplaceCategory === category);
    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.id.includes(q) ||
          i.familyId.includes(q),
      );
    }
    return NextResponse.json({
      view: "agents",
      count: items.length,
      totalAgents,
      familyCount: new Set(items.map((i) => i.familyId)).size,
      items,
      packs,
    });
  }

  const preferred = market && market !== "all" ? (market === "za" ? "africa" : market) : null;
  let items = await listFamilies(preferred);
  if (preferred) {
    items = items.filter((f) => Boolean(f.markets[preferred]));
  }
  if (category && category !== "all") {
    items = items.filter((i) => i.marketplaceCategory === category);
  }
  if (q) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.id.includes(q),
    );
  }

  const agentCount = items.reduce((n, f) => {
    if (preferred) return n + (f.markets[preferred] ? 1 : 0);
    return n + Object.keys(f.markets).length;
  }, 0);

  return NextResponse.json({
    view: "families",
    count: items.length,
    familyCount: items.length,
    agentCount,
    totalAgents,
    items,
    packs,
  });
}
