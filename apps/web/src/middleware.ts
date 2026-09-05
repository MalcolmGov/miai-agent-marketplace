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

/** True when an /api/ request's Content-Length exceeds the configured body cap. */
function exceedsBodyLimit(req: NextRequest, pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  const cl = req.headers.get("content-length");
  if (!cl) return false;
  const size = Number(cl);
  return Number.isFinite(size) && size > maxBodyBytes();
}

/**
 * Presence-only edge auth pre-check under OIDC: admit an /api/ request carrying EITHER a Bearer token
 * OR a first-party business session cookie; challenge one carrying neither. The edge only decides
 * "may this reach the verifier", never "is this authorized" — a forged/expired cookie passes here but
 * is rejected in-route by resolveAuth (HS256). Presence-only keeps jose/Node out of the edge.
 */
function needsApiAuthChallenge(req: NextRequest, pathname: string): boolean {
  if (process.env.MIAI_AUTH_MODE !== "oidc") return false;
  if (!pathname.startsWith("/api/")) return false;
  if (isPublicApiPath(pathname)) return false;
  const hasBearer = (req.headers.get("authorization") || "").startsWith("Bearer ");
  const hasSession = Boolean(req.cookies.get("miai_business_session")?.value);
  return !hasBearer && !hasSession;
}

/**
 * Page-level gate: bounce signed-out visitors from business console PAGES to /login (presence-only —
 * the cookie is cryptographically verified in-route, which stays the hard boundary). Fires under OIDC
 * only; mock/dev is ungated. Opt-in page list, so it can never trap a public page.
 */
function needsLoginRedirect(req: NextRequest, pathname: string): boolean {
  return (
    process.env.MIAI_AUTH_MODE === "oidc" &&
    isGatedBusinessPage(pathname) &&
    !req.cookies.get("miai_business_session")?.value
  );
}

/**
 * Body-size gate on API routes; OIDC presence pre-check + page gate when enabled.
 * Per-request CSP nonce for App Router (script-src without unsafe-inline).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  if (exceedsBodyLimit(req, pathname)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Payload too large" }, { status: 413 }),
      nonce,
    );
  }

  if (needsApiAuthChallenge(req, pathname)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      nonce,
    );
  }

  if (needsLoginRedirect(req, pathname)) {
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
