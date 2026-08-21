import { requireConsumer } from "@/lib/consumer-auth";
import { apiOk, apiErrorFromRequest } from "@/lib/api-error";
import { dismissReminder } from "@/lib/consumer-reminders-store";

export const dynamic = "force-dynamic";

/** Dismiss a reminder. A one-off is cleared; a recurring one rolls forward to its next occurrence. */
export async function POST(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const id = body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
    ? (body as { id: string }).id
    : "";
  if (!id) return apiErrorFromRequest(req, 400, "Missing reminder id");

  const dismissed = await dismissReminder(
    { tenantId: c.auth.workspaceId, consumerId: c.consumerId },
    id,
  );
  return apiOk({ dismissed });
}
