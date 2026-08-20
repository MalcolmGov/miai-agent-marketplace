import { requireConsumer } from "@/lib/consumer-auth";
import { generateDailyBrief } from "@/lib/consumer-brief";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Generate the signed-in consumer's brief right now — for a "brief me now" button, or to
 *  preview the schedule. Metered to the consumer's own wallet like any turn. */
export async function POST(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const result = await generateDailyBrief(c.consumerId, new Date());
  if (!result.ok) {
    return apiErrorFromRequest(req, 502, result.error);
  }
  return apiOk({ brief: result.text });
}
