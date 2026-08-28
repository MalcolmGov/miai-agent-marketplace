import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { isGatedBusinessPage, isPublicApiPath } from "@/lib/public-paths";

/** Default 1 MiB — override with MIAI_MAX_BODY_BYTES. */
function maxBodyBytes(): number {
  const raw = process.env.MIAI_MAX_BODY_BYTES;
  const n = raw ? Number(raw) : 1_048_576;
  return Number.isFinite(n) && n > 0 ? n : 1_048_576;
}

function applySecurityHeaders(res: NextResponse, nonce: string): NextResponse {
  res.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  res.headers.set("x-nonce", nonce);
  return res;
}

/**
 * Body-size gate on API routes; OIDC Bearer pre-check when enabled.
 * Per-request CSP nonce for App Router (script-src without unsafe-inline).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  if (pathname.startsWith("/api/")) {
    const cl = req.headers.get("content-length");
    if (cl) {
      const size = Number(cl);
      if (Number.isFinite(size) && size > maxBodyBytes()) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Payload too large" }, { status: 413 }),
          nonce,
        );
      }
    }
  }

  if (process.env.MIAI_AUTH_MODE === "oidc" && pathname.startsWith("/api/")) {
    if (!isPublicApiPath(pathname)) {
      const auth = req.headers.get("authorization") || "";
      const hasBearer = auth.startsWith("Bearer ");
      // A first-party business session cookie is verified cryptographically IN-ROUTE (resolveAuth ->
      // readBusinessSession, HS256). The edge only decides "may this reach the verifier", never "is
      // this authorized" — so admit a request carrying EITHER credential. A request with neither still
      // 401s here exactly as before; a forged/expired cookie passes this presence check but is then
      // rejected by the in-route verifier (401). Presence-only keeps jose/Node out of the edge.
      const hasSession = Boolean(req.cookies.get("miai_business_session")?.value);
      if (!hasBearer && !hasSession) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
          nonce,
        );
      }
    }
  }

  // Page-level gate: bounce signed-out visitors from business console PAGES to /login (presence-only
  // here — the cookie is cryptographically verified in-route, which stays the hard boundary). Only
  // fires under OIDC; mock/dev is ungated. Opt-in page list, so it can never trap a public page.
  if (
    process.env.MIAI_AUTH_MODE === "oidc" &&
    isGatedBusinessPage(pathname) &&
    !req.cookies.get("miai_business_session")?.value
  ) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("return_to", `${pathname}${req.nextUrl.search}`);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}

export const config = {
  matcher: [
    /*
     * All app + API routes except Next internals and static assets.
     * Needed so HTML responses get a per-request CSP nonce.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
