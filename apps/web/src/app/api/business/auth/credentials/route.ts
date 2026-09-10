import { NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/consumer-oidc";
import { emailOnAllowlist } from "@/lib/business-allowlist";
import {
  BUSINESS_SESSION_COOKIE,
  sessionCookieOptions,
  signBusinessSession,
} from "@/lib/business-session";
import { businessWorkspaceId, ensureOwnerProvisioned } from "@/lib/workspace-members";
import {
  createUserCredential,
  getUserCredential,
  verifyUserPassword,
} from "@/lib/user-credentials";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const action = body.action === "signup" ? "signup" : "signin";
    const returnTo = safeReturnPath(typeof body.returnTo === "string" ? body.returnTo : "/");

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Business allowlist gate (membership only). NOTE: unlike the Google OIDC callback — which uses
    // isBusinessEmailAllowed(email, emailVerified) and requires a Google-verified address — this
    // password path does NOT prove the caller controls the address. A domain-allowlisted signup can
    // therefore self-provision without email verification. Acceptable only for trusted invite-only
    // B2B domains; if that assumption weakens, add an email-confirmation step (or gate signup on an
    // exact-address invite) before minting the credential + session.
    if (!emailOnAllowlist(email)) {
      return NextResponse.json(
        {
          error:
            "Access is limited to invited teams. Please use an authorized email (@myinstantai.com or invited address).",
        },
        { status: 403 },
      );
    }

    let userId: string;

    if (action === "signup") {
      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 },
        );
      }

      const existing = await getUserCredential(email);
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 409 },
        );
      }

      const created = await createUserCredential(email, password);
      if (!created.ok) {
        return NextResponse.json({ error: created.error }, { status: 400 });
      }
      userId = created.cred.userId;
    } else {
      const verified = await verifyUserPassword(email, password);
      if (!verified.ok || !verified.userId) {
        return NextResponse.json(
          { error: verified.error || "Invalid email or password" },
          { status: 401 },
        );
      }
      userId = verified.userId;
    }

    // Provision per-user workspace and seed as owner
    const workspaceId = businessWorkspaceId(userId);
    const identity = {
      sub: userId,
      email,
      name: email.split("@")[0],
    };
    await ensureOwnerProvisioned({ workspaceId, identity });

    // Mint signed business session
    const session = await signBusinessSession(identity);
    const res = NextResponse.json({
      ok: true,
      userId,
      email,
      returnTo,
    });
    res.cookies.set(BUSINESS_SESSION_COOKIE, session, sessionCookieOptions());
    return res;
  } catch (err) {
    console.error("[credentials-auth] error:", err);
    return NextResponse.json({ error: "Sign-in could not be completed" }, { status: 500 });
  }
}
