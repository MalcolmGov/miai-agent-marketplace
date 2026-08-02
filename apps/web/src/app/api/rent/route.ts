import { getPreset, defaultBindingsForTools } from "@miai/presets";
import { getAgentPackage } from "@/lib/catalog";
import { appendAudit, upsertWorkspaceAgent } from "@/lib/store";
import { TIER_PRICES } from "@/lib/constants";
import type { RentTier } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";
import { apiErrorFromRequest, apiOk } from "@/lib/api-error";
import { formatZodError, rentBodySchema } from "@/lib/api-schemas";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return apiErrorFromRequest(req, 400, "Invalid JSON body");
  }

  const parsed = rentBodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiErrorFromRequest(req, 400, "Invalid request body", formatZodError(parsed.error));
  }
  const body = parsed.data;

  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const pkg = await getAgentPackage(body.agentId);
  if (!pkg) return apiErrorFromRequest(req, 404, "Unknown agent");

  const tier: RentTier = body.tier ?? (pkg.manifest.tier as RentTier);
  const preset = getPreset(body.agentId);
  const bindings =
    preset?.bindings ?? defaultBindingsForTools(pkg.tools.map((t) => t.name));

  const rental = await upsertWorkspaceAgent(workspaceId, body.agentId, {
    agentId: body.agentId,
    state: "configuring",
    tier,
    model: pkg.manifest.model.primary,
    knowledge: pkg.knowledge,
    bindings,
    rentedAt: new Date().toISOString(),
  });

  await appendAudit({
    workspaceId,
    agentId: body.agentId,
    type: "rent",
    detail: {
      tier,
      priceUsd: TIER_PRICES[tier],
      publicKey: rental.publicKey,
      userId: auth.userId,
    },
  });

  return apiOk({ ok: true, rental, priceUsd: TIER_PRICES[tier] });
}
