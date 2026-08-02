import { appendAudit } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { WORKSPACE_ID } from "@/lib/constants";
import { consentBodySchema, parseJsonBody } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

/** Record cookie/consent choice (Phase 4 I1). Public; workspace from auth when present. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, consentBodySchema);
  if (!parsed.ok) return parsed.response;
  const choice = parsed.data.choice;

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
