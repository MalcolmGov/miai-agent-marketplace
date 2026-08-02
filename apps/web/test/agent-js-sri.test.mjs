import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AGENT_JS_SCRIPT,
  AGENT_JS_INTEGRITY,
  computeAgentJsIntegrity,
  agentJsDigestHeader,
  buildEmbedScriptTag,
} from "../src/lib/agent-js-sri.ts";

const SRI_RE = /^sha384-[A-Za-z0-9+/=]+$/;

describe("agent.js SRI", () => {
  it("computeAgentJsIntegrity matches sha384 base64 format", () => {
    const integrity = computeAgentJsIntegrity(AGENT_JS_SCRIPT);
    assert.match(integrity, SRI_RE);
  });

  it("AGENT_JS_INTEGRITY is stable for the script template", () => {
    assert.equal(AGENT_JS_INTEGRITY, computeAgentJsIntegrity(AGENT_JS_SCRIPT));
    assert.match(AGENT_JS_INTEGRITY, SRI_RE);
  });

  it("agentJsDigestHeader uses RFC 9530 framing", () => {
    const digest = agentJsDigestHeader(AGENT_JS_INTEGRITY);
    assert.match(digest, /^sha-384=:[A-Za-z0-9+/=]+:$/);
  });

  it("buildEmbedScriptTag includes integrity and crossorigin", () => {
    const tag = buildEmbedScriptTag({
      src: "https://example.com/agents/v1/agent.js",
      key: "mia_pk_test",
    });
    assert.match(tag, /integrity="sha384-[A-Za-z0-9+/=]+"/);
    assert.match(tag, /crossorigin="anonymous"/);
  });
});
