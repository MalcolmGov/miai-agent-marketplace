import { NextResponse } from "next/server";
import { appBaseUrl, safeReturnPath } from "@/lib/consumer-oidc";
import { BUSINESS_SESSION_COOKIE, sessionCookieOptions } from "@/lib/business-session";

export const dynamic = "force-dynamic";

/** Clear the business session cookie and return to a (re-validated) same-origin path. */
function clearAndRedirect(returnTo: string | null) {
  const res = NextResponse.redirect(new URL(safeReturnPath(returnTo || "/"), appBaseUrl()).toString());
  res.cookies.set(BUSINESS_SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

export async function GET(req: Request) {
  return clearAndRedirect(new URL(req.url).searchParams.get("return_to"));
}

export const POST = GET;
