import { NextResponse } from "next/server";
import { probeOAuthConnector, probeSupportedConnectors } from "@miai/connectors";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import { assertProofHarness } from "@/lib/proof-harness";

export const dynamic = "force-dynamic";

/**
 * Read-only live probe — confirms the stored OAuth token still works with the vendor.
 * Zero LLM. POST /api/oauth/{connector}/test
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ connector: string }> },
) {
  const gate = assertProofHarness(req);
  if (gate) return gate;

  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const { connector } = await ctx.params;
  const supported = probeSupportedConnectors();
  if (!supported.includes(connector)) {
    return NextResponse.json(
      { ok: false, connector, error: "probe_not_supported", supported },
      { status: 400 },
    );
  }

  let body: { workspaceId?: string } = {};
  try {
    body = (await req.json()) as { workspaceId?: string };
  } catch {
    /* empty body ok */
  }

  const workspaceId =
    auth.mode === "oidc"
      ? auth.workspaceId
      : body.workspaceId ||
        new URL(req.url).searchParams.get("workspaceId") ||
        auth.workspaceId;

  const result = await probeOAuthConnector(workspaceId, connector);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
