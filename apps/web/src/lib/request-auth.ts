import { NextResponse } from "next/server";
import { AuthError, resolveAuth, type AuthContext } from "@/lib/auth";

/** Resolve auth or return a NextResponse error. */
export async function requireAuth(req: Request): Promise<AuthContext | NextResponse> {
  try {
    return await resolveAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 },
    );
  }
}

export function isAuthContext(v: AuthContext | NextResponse): v is AuthContext {
  return !(v instanceof NextResponse);
}
