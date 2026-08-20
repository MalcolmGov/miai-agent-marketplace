import { createHash, timingSafeEqual } from "node:crypto";
import { runDueBriefs } from "@/lib/consumer-brief";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** Constant-time secret compare (sha256 so inputs are always equal length). */
function secretMatches(candidate: string, secret: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(candidate).digest(),
    createHash("sha256").update(secret).digest(),
  );
}

function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when not configured
  const header = req.headers.get("x-cron-secret") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  return secretMatches(header, secret) || secretMatches(bearer, secret);
}

/** Cron sweep: generate a brief for every consumer whose schedule is due now. Public to the OIDC
 *  gate (see public-paths) but authenticated by CRON_SECRET — a scheduler POSTs here hourly. */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) {
    return apiErrorFromRequest(req, 401, "Unauthorized");
  }
  const result = await runDueBriefs(new Date());
  return apiOk({ ran: result.ran.length, considered: result.considered, failed: result.failed });
}
