import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  return NextResponse.json({ events: listAudit(limit) });
}
