import { requireConsumer } from "@/lib/consumer-auth";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { eraseConsumerData } from "@/lib/consumer-dsar";
import { dsarEraseBodySchema, parseJsonBody } from "@/lib/api-schemas";

export const dynamic = "force-dynamic";

/**
 * DSAR erasure for the SIGNED-IN person (their own data only). No role check — the caller is the
 * data subject. Requires explicit { confirm: true }. Prepaid wallet tokens are NOT forfeited.
 */
export async function POST(req: Request) {
  const c = await requireConsumer(req);
  if (c instanceof Response) return c;

  const parsed = await parseJsonBody(req, dsarEraseBodySchema);
  if (!parsed.ok) {
    return apiErrorFromRequest(
      req,
      400,
      "Destructive erasure requires { confirm: true } in the request body",
    );
  }

  const { deleted } = await eraseConsumerData({
    tenantId: c.auth.workspaceId,
    consumerId: c.consumerId,
  });

  return apiOk({
    ok: true,
    deleted,
    notice:
      "Your personal data has been erased. Prepaid wallet tokens were retained; contact support for a refund.",
  });
}
