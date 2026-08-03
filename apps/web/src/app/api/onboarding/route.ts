import { NextResponse } from "next/server";
import { isOperator } from "@/lib/security";
import { isAuthContext, requireAuth } from "@/lib/request-auth";
import {
  onboardingCompleteBodySchema,
  onboardingPatchBodySchema,
  parseJsonBody,
} from "@/lib/api-schemas";
import {
  getWorkspaceOnboarding,
  upsertWorkspaceOnboarding,
} from "@/lib/workspace-onboarding";
import { appendAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Current workspace onboarding + auth summary for sidebar / checklist. */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const profile = await getWorkspaceOnboarding(auth.workspaceId);
  return NextResponse.json({
    me: {
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      roles: auth.roles,
      mode: auth.mode,
      isOperator: isOperator(auth),
      product:
        profile?.product === "agents" ||
        (typeof auth.raw?.product === "string" && auth.raw.product === "agents")
          ? "agents"
          : profile?.wizardCompleted
            ? "agents"
            : null,
    },
    profile,
  });
}

/** Complete business wizard → persist profile, open checklist. */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const parsed = await parseJsonBody(req, onboardingCompleteBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const now = new Date().toISOString();
  const profile = await upsertWorkspaceOnboarding(auth.workspaceId, {
    companyName: body.companyName,
    market: body.market,
    industry: body.industry,
    companySize: body.companySize,
    intent: body.intent,
    contactEmail: body.contactEmail,
    wizardCompleted: true,
    checklistDismissed: false,
    checklist: {
      market: false,
      browse: false,
      try: false,
      rent: false,
      install: false,
    },
    completedAt: now,
  });

  await appendAudit({
    workspaceId: auth.workspaceId,
    type: "onboarding_complete",
    detail: {
      companyName: profile.companyName,
      market: profile.market,
      intent: profile.intent,
      userId: auth.userId,
    },
  });

  return NextResponse.json({
    ok: true,
    profile,
    redirect: `/?onboarding=1&market=${profile.market}`,
  });
}

/** Update checklist progress / dismiss. */
export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if (!isAuthContext(auth)) return auth;

  const parsed = await parseJsonBody(req, onboardingPatchBodySchema);
  if (!parsed.ok) return parsed.response;

  const existing = await getWorkspaceOnboarding(auth.workspaceId);
  if (!existing) {
    return NextResponse.json({ error: "Onboarding profile not found" }, { status: 404 });
  }

  const profile = await upsertWorkspaceOnboarding(auth.workspaceId, {
    checklist: parsed.data.checklist
      ? { ...existing.checklist, ...parsed.data.checklist }
      : undefined,
    checklistDismissed: parsed.data.checklistDismissed,
  });

  return NextResponse.json({ ok: true, profile });
}
