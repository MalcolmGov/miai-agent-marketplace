import { requireConsumer } from "@/lib/consumer-auth";
import { getBriefRecord, setBriefConfig } from "@/lib/consumer-brief-store";
import { briefConfigSchema, formatZodError } from "@/lib/api-schemas";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** The signed-in consumer's daily-brief schedule + their most recent brief. */
export async function GET(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;
  const record = await getBriefRecord(c.consumerId);
  return apiOk({ config: record.config, latest: record.latest, lastSentOn: record.lastSentOn });
}

/** Update the schedule (enable/disable, local hour, timezone, channel). */
export async function PUT(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }
  const parsed = briefConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
  }

  const record = await setBriefConfig(c.consumerId, parsed.data);
  return apiOk({ config: record.config, latest: record.latest, lastSentOn: record.lastSentOn });
}
