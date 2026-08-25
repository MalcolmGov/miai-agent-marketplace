import { NextResponse } from "next/server";
import { consumerOidcConfigured } from "@/lib/consumer-oidc";
import { readConsumerSession } from "@/lib/consumer-session";

export const dynamic = "force-dynamic";

/**
 * Who is signed in, for the consumer UI. In mock mode everyone is "signed in" (frictionless
 * sandbox); in oidc mode `signedIn` reflects the session cookie, so the UI can show a
 * "Sign in with Google" gate when a real login is required.
 */
export async function GET(req: Request) {
  const mode = process.env.MIAI_AUTH_MODE === "oidc" ? "oidc" : "mock";
  const session = mode === "oidc" ? await readConsumerSession(req) : null;
  return NextResponse.json({
    mode,
    signInEnabled: consumerOidcConfigured(),
    signedIn: mode === "mock" ? true : Boolean(session),
    email: session?.email ?? null,
    name: session?.name ?? null,
  });
}
