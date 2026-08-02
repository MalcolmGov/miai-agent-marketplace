import { createHash } from "node:crypto";
import { AGENT_JS_SCRIPT } from "@/lib/agent-js-script";

export { AGENT_JS_SCRIPT } from "@/lib/agent-js-script";

/** Stable sha384 (base64) SRI token for the embed script body. */
export function computeAgentJsIntegrity(script: string = AGENT_JS_SCRIPT): string {
  const digest = createHash("sha384").update(script, "utf8").digest("base64");
  return `sha384-${digest}`;
}

export const AGENT_JS_INTEGRITY = computeAgentJsIntegrity();

/** RFC 9530 Digest header value for the script body. */
export function agentJsDigestHeader(integrity: string = AGENT_JS_INTEGRITY): string {
  const base64 = integrity.replace(/^sha384-/, "");
  return `sha-384=:${base64}:`;
}
