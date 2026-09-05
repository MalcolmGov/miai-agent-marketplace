export const dynamic = "force-dynamic";

/** Process liveness only. Dependency/configuration failures belong to /api/health readiness. */
export function GET() {
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
