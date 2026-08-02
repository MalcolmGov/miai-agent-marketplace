import { NextResponse, type NextRequest } from "next/server";

/** Default 1 MiB — override with MIAI_MAX_BODY_BYTES. */
function maxBodyBytes(): number {
  const raw = process.env.MIAI_MAX_BODY_BYTES;
  const n = raw ? Number(raw) : 1_048_576;
  return Number.isFinite(n) && n > 0 ? n : 1_048_576;
}

/**
 * When MIAI_AUTH_MODE=oidc, require Bearer token on protected API routes.
 * Full JWT verification happens in route handlers via resolveAuth().
 * Security response headers are set in next.config.ts for all routes.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const cl = req.headers.get("content-length");
    if (cl) {
      const size = Number(cl);
      if (Number.isFinite(size) && size > maxBodyBytes()) {
        return NextResponse.json({ error: "Payload too large" }, { status: 413 });
      }
    }
  }

  if (process.env.MIAI_AUTH_MODE !== "oidc") {
    return NextResponse.next();
  }

  const publicPaths = [
    "/api/health",
    "/api/catalog",
    "/api/oauth/callback",
    "/api/embed/",
    "/api/app/",
    "/agents/v1/",
    // Wave4 sinks — gated by WEBHOOK_SINK_SECRET / MCP_SINK_TOKEN in production
    "/api/webhook/sink",
    "/api/mcp",
  ];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
