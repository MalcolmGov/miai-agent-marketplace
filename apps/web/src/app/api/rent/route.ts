import { NextResponse } from "next/server";
import { getPreset, defaultBindingsForTools } from "@miai/presets";
import { getAgentPackage } from "@/lib/catalog";
import { appendAudit, upsertWorkspaceAgent } from "@/lib/store";
import { TIER_PRICES } from "@/lib/constants";
import type { RentTier } from "@/lib/store";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { requireRole } from "@/lib/security";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;
  const forbidden = requireRole(auth, "admin");
  if (forbidden) return forbidden;

  const body = (await req.json()) as {
    agentId: string;
    tier?: RentTier;
    workspaceId?: string;
  };
  const workspaceId =
    auth.mode === "oidc" ? auth.workspaceId : (body.workspaceId ?? auth.workspaceId);
  const pkg = await getAgentPackage(body.agentId);
  if (!pkg) return NextResponse.json({ error: "Unknown agent" }, { status: 404 });

  const tier = body.tier ?? (pkg.manifest.tier as RentTier);
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

  return NextResponse.json({ ok: true, rental, priceUsd: TIER_PRICES[tier] });
}
