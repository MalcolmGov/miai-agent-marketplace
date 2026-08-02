import { AGENT_JS_INTEGRITY } from "@/lib/agent-js-sri";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ integrity: AGENT_JS_INTEGRITY });
}
