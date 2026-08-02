import { NextResponse } from "next/server";
import {
  countIndexedMarketSkus,
  INDEXED_AGENT_COUNT,
  listCatalog,
  listFamilies,
  listMarketPacks,
} from "@/lib/catalog";
import { isMondayPilotFamilyId } from "@/lib/monday-pilot";
import { isWorkflowFamilyId } from "@/lib/workflows";

export const dynamic = "force-dynamic";

function sortWorkflowFirst<T extends { id: string; pilot?: boolean; liveReady?: boolean }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aw = isWorkflowFamilyId(a.id) ? 1 : 0;
    const bw = isWorkflowFamilyId(b.id) ? 1 : 0;
    if (aw !== bw) return bw - aw;
    const ap = a.pilot || a.liveReady ? 1 : 0;
    const bp = b.pilot || b.liveReady ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return a.id.localeCompare(b.id);
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const market = searchParams.get("market");
  const category = searchParams.get("category");
  const audience = searchParams.get("audience");
  const workflow = searchParams.get("workflow");
  const pilot = searchParams.get("pilot");
  const view = searchParams.get("view") ?? "families";
  const packs = await listMarketPacks();
  const allAgents = await listCatalog();
  // Indexed commercial SKUs = 100 × 5; on-disk ZA aliases are not a 6th market.
  const totalAgents = INDEXED_AGENT_COUNT;

  if (view === "agents") {
    let items = allAgents;
    if (market && market !== "all") {
      const m = market === "za" ? "africa" : market;
      items = items.filter((i) => i.market === m);
    }
    if (category && category !== "all")
      items = items.filter((i) => i.marketplaceCategory === category);
    if (audience === "customer" || audience === "internal") {
      items = items.filter((i) => i.audience === audience);
    }
    if (workflow === "1" || workflow === "true") {
      items = items.filter((i) => isWorkflowFamilyId(i.familyId) || isWorkflowFamilyId(i.id));
    }
    if (pilot === "1" || pilot === "true") {
      items = items.filter((i) => isMondayPilotFamilyId(i.familyId) || isMondayPilotFamilyId(i.id));
    }
    if (q) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.id.includes(q) ||
          i.familyId.includes(q),
      );
    }
    items = sortWorkflowFirst(items);
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
  if (audience === "customer" || audience === "internal") {
    items = items.filter((i) => i.audience === audience);
  }
  if (workflow === "1" || workflow === "true") {
    items = items.filter((i) => isWorkflowFamilyId(i.id));
  }
  if (pilot === "1" || pilot === "true") {
    items = items.filter((i) => isMondayPilotFamilyId(i.id));
  }
  if (q) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.id.includes(q),
    );
  }

  items = sortWorkflowFirst(items);

  const agentCount = preferred
    ? items.length
    : items.reduce((n, f) => n + countIndexedMarketSkus(f.markets ?? {}), 0);

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
