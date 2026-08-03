import { NextResponse } from "next/server";
import { authHandoffPayload } from "@/lib/agents-auth";

export const dynamic = "force-dynamic";

/** Public: how the client should enter Agents auth (mock vs external MIAI). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") || undefined;
  return NextResponse.json(authHandoffPayload({ returnTo }));
}
