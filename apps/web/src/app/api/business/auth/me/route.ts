import { NextResponse } from "next/server";
import { businessOidcConfigured } from "@/lib/business-oidc";
import { readBusinessSession } from "@/lib/business-session";

export const dynamic = "force-dynamic";

/**
 * Who is signed in to the business console. In mock mode everyone is "signed in" (frictionless
 * staging); in oidc mode `signedIn` reflects the business session cookie, so /login can show the
 * "Continue with Google" gate and complete the post-callback shell sync.
 */
export async function GET(req: Request) {
  const mode = process.env.MIAI_AUTH_MODE === "oidc" ? "oidc" : "mock";
  const session = mode === "oidc" ? await readBusinessSession(req) : null;
  return NextResponse.json({
    mode,
    signInEnabled: businessOidcConfigured(),
    signedIn: mode === "mock" ? true : Boolean(session),
    email: session?.email ?? null,
    name: session?.name ?? null,
  });
}
