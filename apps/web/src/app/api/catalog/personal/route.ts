import { NextResponse } from "next/server";
import { listPersonalAgents } from "@/lib/consumer-catalog";

export const dynamic = "force-dynamic";

/** Personal (consumer) agent catalogue — separate from the business marketplace index. */
export async function GET() {
  const items = await listPersonalAgents();
  return NextResponse.json({ view: "personal", count: items.length, items });
}
