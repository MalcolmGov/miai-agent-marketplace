import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? "50");
  const events = await listAudit(limit);
  const filtered =
    auth.mode === "oidc"
      ? events.filter((e) => e.workspaceId === auth.workspaceId)
      : events;
  return NextResponse.json({ events: filtered });
}
