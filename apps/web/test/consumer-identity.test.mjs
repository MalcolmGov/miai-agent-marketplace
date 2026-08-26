import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { resolveConsumerAuth } from "../src/lib/consumer-identity.ts";

/**
 * The consumer surface (/api/consumer/*) is Bearer-gate-public, so resolveConsumerAuth IS the
 * identity enforcement for it. It must be fail-closed in BOTH modes — never derive the person from
 * client-controlled input, or any caller could impersonate another consumer's wallet + memory.
 */
describe("consumer identity — fail-closed on the Bearer-exempt consumer surface", () => {
  let savedMode;
  beforeEach(() => {
    savedMode = process.env.MIAI_AUTH_MODE;
  });
  afterEach(() => {
    if (savedMode === undefined) delete process.env.MIAI_AUTH_MODE;
    else process.env.MIAI_AUTH_MODE = savedMode;
  });

  it("mock mode pins the consumer id — ?userId and x-user-id cannot impersonate", async () => {
    process.env.MIAI_AUTH_MODE = "mock";
    const req = new Request(
      "https://app.example/api/consumer/chat?workspaceId=myinstantai&userId=victim",
      { headers: { "x-user-id": "victim2" } },
    );
    const auth = await resolveConsumerAuth(req);
    assert.equal(auth.mode, "mock");
    // Pinned to the demo identity — NOT the attacker-supplied victim/victim2.
    assert.equal(auth.userId, "demo-user");
    // A consumer is never granted owner/operator (resolveAuth's elevated mock default is bypassed).
    assert.deepEqual(auth.roles, []);
  });

  it("mock mode still scopes the brand namespace from workspaceId, but the person stays pinned", async () => {
    process.env.MIAI_AUTH_MODE = "mock";
    const viaQuery = await resolveConsumerAuth(
      new Request("https://app.example/api/consumer/chat?workspaceId=brandA"),
    );
    const viaHeader = await resolveConsumerAuth(
      new Request("https://app.example/api/consumer/chat", {
        headers: { "x-workspace-id": "brandB" },
      }),
    );
    assert.equal(viaQuery.workspaceId, "brandA");
    assert.equal(viaHeader.workspaceId, "brandB");
    assert.equal(viaQuery.userId, "demo-user");
    assert.equal(viaHeader.userId, "demo-user");
  });

  it("oidc mode with no session is fail-closed — rejects, never a default identity", async () => {
    process.env.MIAI_AUTH_MODE = "oidc";
    const req = new Request("https://app.example/api/consumer/chat?workspaceId=myinstantai");
    await assert.rejects(resolveConsumerAuth(req));
  });
});
