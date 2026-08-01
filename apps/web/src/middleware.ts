import { NextResponse, type NextRequest } from "next/server";

/**
 * When MIAI_AUTH_MODE=oidc, require Bearer token on protected API routes.
 * Full JWT verification happens in route handlers via resolveAuth().
 * Security response headers are set in next.config.ts for all routes.
 */
export function middleware(req: NextRequest) {
  if (process.env.MIAI_AUTH_MODE !== "oidc") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const publicPaths = [
    "/api/health",
    "/api/catalog",
    "/api/oauth/callback",
    "/api/embed/",
    "/api/app/",
    "/agents/v1/",
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
