import {
  AGENT_JS_SCRIPT,
  agentJsDigestHeader,
  computeAgentJsIntegrity,
} from "@/lib/agent-js-sri";

export const dynamic = "force-dynamic";

export async function GET() {
  const integrity = computeAgentJsIntegrity(AGENT_JS_SCRIPT);
  return new Response(AGENT_JS_SCRIPT, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
      "access-control-allow-origin": "*",
      "x-miai-script-integrity": integrity,
      Digest: agentJsDigestHeader(integrity),
    },
  });
}
