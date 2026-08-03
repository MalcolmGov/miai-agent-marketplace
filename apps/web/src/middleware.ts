import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";

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
    const publicPaths = [
      "/api/health",
      "/api/catalog",
      "/api/oauth/callback",
      "/api/embed/",
      "/api/app/",
      "/agents/v1/",
      "/api/webhook/sink",
      "/api/mcp",
      "/api/consent",
      "/api/auth/handoff",
    ];
    const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p));
    if (!isPublic) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return applySecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
          nonce,
        );
      }
    }
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
