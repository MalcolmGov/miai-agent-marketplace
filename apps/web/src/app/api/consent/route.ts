import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { WORKSPACE_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Record cookie/consent choice (Phase 4 I1). Public; workspace from auth when present. */
export async function POST(req: Request) {
  let body: { choice?: string };
  try {
    body = (await req.json()) as { choice?: string };
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }
  const choice = body.choice === "accepted" || body.choice === "essential" ? body.choice : null;
  if (!choice) return apiErrorFromRequest(req, 400, "choice must be accepted or essential");

  let workspaceId = WORKSPACE_ID;
  let userId: string | undefined;
  const auth = await requireAuth(req);
  if (isAuthContext(auth)) {
    workspaceId = auth.workspaceId;
    userId = auth.userId;
  }

  await appendAudit({
    workspaceId,
    type: "consent_recorded",
    detail: { choice, channel: "web_banner" },
    userId,
  });

  return apiOk({ ok: true, choice });
}
