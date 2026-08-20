/**
 * OIDC tenant-isolation integration test (audit blocker B2).
 *
 * Stands up a real local JWKS endpoint, points MIAI_OIDC_JWKS_URL at it, and drives the
 * production resolveAuth() path with signed JWTs. Proves the property the whole
 * multi-tenant model rests on: under OIDC the caller's workspace/roles come from the
 * cryptographically verified token — NOT from client-controlled x-workspace-id / x-roles
 * headers or ?workspaceId query (the mock-rails escalation vector), and forged/wrong-key/
 * wrong-audience/claimless tokens are rejected.
 *
 * Run: pnpm --filter @miai/web test:api-contract  (or the repo `pnpm test`)
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

const ISSUER = "https://issuer.test";
const AUDIENCE = "miai-agents";
const KID = "test-key-1";

describe("oidc tenant isolation (JWKS-backed resolveAuth)", () => {
  const saved = {};
  let server;
  let trustedKey;
  let untrustedKey;
  let auth;

  before(async () => {
    for (const k of [
      "MIAI_AUTH_MODE",
      "MIAI_OIDC_ISSUER",
      "MIAI_OIDC_AUDIENCE",
      "MIAI_OIDC_JWKS_URL",
    ]) {
      saved[k] = process.env[k];
    }

    trustedKey = await generateKeyPair("RS256");
    untrustedKey = await generateKeyPair("RS256");
    const pubJwk = await exportJWK(trustedKey.publicKey);
    pubJwk.kid = KID;
    pubJwk.alg = "RS256";
    pubJwk.use = "sig";

    server = createServer((req, res) => {
      if (req.url === "/jwks.json") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ keys: [pubJwk] }));
        return;
      }
      res.statusCode = 404;
      res.end("not found");
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();

    process.env.MIAI_AUTH_MODE = "oidc";
    process.env.MIAI_OIDC_ISSUER = ISSUER;
    process.env.MIAI_OIDC_AUDIENCE = AUDIENCE;
    process.env.MIAI_OIDC_JWKS_URL = `http://127.0.0.1:${port}/jwks.json`;

    // Import AFTER env is set (resolveAuth reads env + memoizes the JWKS on first use).
    auth = await import("../src/lib/auth.ts");
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const sign = (key, claims, { aud = AUDIENCE, iss = ISSUER } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: KID })
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key.privateKey);

  it("binds identity to the verified workspace_id / user_id / roles claims", async () => {
    const token = await sign(trustedKey, {
      workspace_id: "ws-alpha",
      user_id: "user-1",
      roles: ["admin"],
    });
    const ctx = await auth.resolveAuth(
      new Request("https://marketplace.test/api/ops", {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    assert.equal(ctx.mode, "oidc");
    assert.equal(ctx.workspaceId, "ws-alpha");
    assert.equal(ctx.userId, "user-1");
    assert.deepEqual(ctx.roles, ["admin"]);
  });

  it("ignores client-supplied x-workspace-id / x-roles / ?workspaceId (no cross-tenant escalation)", async () => {
    const token = await sign(trustedKey, {
      workspace_id: "ws-alpha",
      user_id: "user-1",
      roles: ["admin"],
    });
    const ctx = await auth.resolveAuth(
      new Request("https://marketplace.test/api/ops?workspaceId=ws-victim", {
        headers: {
          authorization: `Bearer ${token}`,
          "x-workspace-id": "ws-victim",
          "x-user-id": "attacker",
          "x-roles": "operator,owner",
        },
      }),
    );
    // The forged headers/query must be completely ignored under OIDC.
    assert.equal(ctx.workspaceId, "ws-alpha");
    assert.equal(ctx.userId, "user-1");
    assert.deepEqual(ctx.roles, ["admin"]);
  });

  it("rejects a token signed by an untrusted key", async () => {
    const token = await sign(untrustedKey, { workspace_id: "ws-alpha" });
    await assert.rejects(() =>
      auth.resolveAuth(
        new Request("https://marketplace.test/api/ops", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    );
  });

  it("rejects a token missing the workspace_id claim with 403", async () => {
    const token = await sign(trustedKey, { user_id: "user-1", roles: ["admin"] });
    await assert.rejects(
      () =>
        auth.resolveAuth(
          new Request("https://marketplace.test/api/ops", {
            headers: { authorization: `Bearer ${token}` },
          }),
        ),
      (err) => {
        assert.equal(err.status, 403);
        return true;
      },
    );
  });

  it("rejects a wrong-audience token", async () => {
    const token = await sign(
      trustedKey,
      { workspace_id: "ws-alpha" },
      { aud: "some-other-audience" },
    );
    await assert.rejects(() =>
      auth.resolveAuth(
        new Request("https://marketplace.test/api/ops", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    );
  });
});
