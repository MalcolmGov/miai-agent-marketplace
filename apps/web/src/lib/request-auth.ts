import { AuthError, resolveAuth, type AuthContext } from "@/lib/auth";

/**
 * Resolve auth or return an error Response. Native Response (not NextResponse) so this core
 * helper carries no next/server dependency — routes stay unit-testable outside the bundler,
 * and a Next route handler returns a plain Response just fine.
 */
export async function requireAuth(req: Request): Promise<AuthContext | Response> {
  try {
    return await resolveAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export function isAuthContext(v: AuthContext | Response): v is AuthContext {
  return !(v instanceof Response);
}
