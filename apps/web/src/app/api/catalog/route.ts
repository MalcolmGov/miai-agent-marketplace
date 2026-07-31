import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase().trim();
  const market = searchParams.get("market");
  const category = searchParams.get("category");
  let items = await listCatalog();
  if (market && market !== "all") items = items.filter((i) => i.market === market);
  if (category && category !== "all")
    items = items.filter((i) => i.marketplaceCategory === category);
  if (q) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.id.includes(q),
    );
  }
  return NextResponse.json({ count: items.length, items });
}
