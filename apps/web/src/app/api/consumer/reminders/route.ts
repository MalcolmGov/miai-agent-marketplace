import { requireConsumer } from "@/lib/consumer-auth";
import { apiOk } from "@/lib/api-error";
import { listReminders } from "@/lib/consumer-reminders-store";

export const dynamic = "force-dynamic";

/** The signed-in consumer's pending reminders (soonest first), scoped to their brand + account. */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const reminders = await listReminders({
    tenantId: c.auth.workspaceId,
    consumerId: c.consumerId,
  });
  return apiOk({ reminders });
}
