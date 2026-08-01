import { NextResponse } from "next/server";
import {
  createCustomRequest,
  listCustomRequests,
  type CustomRequestSource,
} from "@/lib/custom-requests";
import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireOperator, requireRole } from "@/lib/security";

export const dynamic = "force-dynamic";

/** List custom requests — operators see all; partners see none (pipeline is operator-owned). */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireOperator(auth);
  if (forbidden) return forbidden;
  const status = new URL(req.url).searchParams.get("status") as
    | "new"
    | "reviewing"
    | "scoped"
    | "done"
    | "declined"
    | null;
  const requests = await listCustomRequests(status ? { status } : undefined);
  return NextResponse.json({ requests });
}

/** Submit a custom agent request from Dashboard / Create. */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "agent");
  if (forbidden) return forbidden;

  const body = (await req.json()) as {
    business?: string;
    need?: string;
    source?: CustomRequestSource;
    contactEmail?: string;
    contactName?: string;
    channel?: string;
  };

  const business = (body.business ?? "").trim();
  const need = (body.need ?? "").trim();
  if (business.length < 2) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }
  if (need.length < 10) {
    return NextResponse.json(
      { error: "Describe what you need in at least a short paragraph" },
      { status: 400 },
    );
  }

  const source: CustomRequestSource =
    body.source === "Marketing page" || body.source === "Create" ? body.source : "Dashboard";

  const row = await createCustomRequest({
    business,
    need,
    source,
    workspaceId: auth.workspaceId,
    contactEmail: body.contactEmail,
    contactName: body.contactName,
    channel: body.channel,
  });

  await appendAudit({
    workspaceId: auth.workspaceId,
    type: "custom_request",
    detail: { id: row.id, business: row.business, source: row.source, userId: auth.userId },
  });

  return NextResponse.json({ ok: true, request: row }, { status: 201 });
}
