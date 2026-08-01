import { NextResponse } from "next/server";
import { listAskLeads } from "@/lib/ask-leads";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator } from "@/lib/security";

/** Operator-only list of leads captured by the marketplace Ask AI assistant. */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireOperator(auth);
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
  const leads = await listAskLeads(limit);
  return NextResponse.json({ leads, count: leads.length });
}
