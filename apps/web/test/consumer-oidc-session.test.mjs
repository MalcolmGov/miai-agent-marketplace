/**
 * Consumer per-person auth: the signed session cookie (Sign in with Google) and the
 * resolveConsumerAuth enforcement that keys memory to the real person.
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

const SECRET = "test-session-secret-please-change-0123456789";

describe("consumer session + resolveConsumerAuth (per-person OIDC)", () => {
  const saved = {};
  let session;
  let cauth;

  before(async () => {
    for (const k of ["MIAI_AUTH_MODE", "MIAI_SESSION_SECRET", "OAUTH_TOKEN_SECRET", "NODE_ENV"]) {
      saved[k] = process.env[k];
    }
    process.env.MIAI_SESSION_SECRET = SECRET;
    process.env.NODE_ENV = "test";
    delete process.env.MIAI_AUTH_MODE;
    session = await import("../src/lib/consumer-session.ts");
    cauth = await import("../src/lib/consumer-identity.ts");
  });

  after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const reqWithCookie = (name, value, url = "https://app.test/api/consumer/chat?workspaceId=myinstantai") =>
    new Request(url, { headers: { cookie: `${name}=${encodeURIComponent(value)}` } });

  it("session cookie round-trips the verified identity", async () => {
    const token = await session.signSession({ sub: "google-123", email: "a@b.com", name: "Ada" });
    const id = await session.readConsumerSession(reqWithCookie(session.SESSION_COOKIE, token));
    assert.equal(id.sub, "google-123");
    assert.equal(id.email, "a@b.com");
    assert.equal(id.name, "Ada");
  });

  it("no cookie => null; tampered token => null", async () => {
    assert.equal(await session.readConsumerSession(new Request("https://app.test/x")), null);
    const token = await session.signSession({ sub: "google-123" });
    assert.equal(
      await session.readConsumerSession(reqWithCookie(session.SESSION_COOKIE, `${token}tamper`)),
      null,
    );
  });

  it("a session signed with a different secret is rejected (forgery)", async () => {
    const token = await session.signSession({ sub: "google-123" });
    process.env.MIAI_SESSION_SECRET = "a-totally-different-secret-key-987654321";
    const id = await session.readConsumerSession(reqWithCookie(session.SESSION_COOKIE, token));
    process.env.MIAI_SESSION_SECRET = SECRET;
    assert.equal(id, null);
  });

  it("login-state cookie round-trips state/nonce/verifier/returnTo", async () => {
    const token = await session.signLoginState({ state: "s", nonce: "n", verifier: "v", returnTo: "/me" });
    const ls = await session.readLoginState(reqWithCookie(session.LOGIN_STATE_COOKIE, token));
    assert.deepEqual(ls, { state: "s", nonce: "n", verifier: "v", returnTo: "/me" });
  });

  it("resolveConsumerAuth: mock mode => shared demo identity", async () => {
    delete process.env.MIAI_AUTH_MODE;
    const ctx = await cauth.resolveConsumerAuth(
      new Request("https://app.test/api/consumer/chat?workspaceId=myinstantai"),
    );
    assert.equal(ctx.userId, "demo-user");
    assert.equal(ctx.workspaceId, "myinstantai");
  });

  it("resolveConsumerAuth: oidc + valid session => userId=sub, tenant=brand", async () => {
    process.env.MIAI_AUTH_MODE = "oidc";
    const token = await session.signSession({ sub: "google-abc", email: "p@q.com" });
    const ctx = await cauth.resolveConsumerAuth(reqWithCookie(session.SESSION_COOKIE, token));
    assert.equal(ctx.mode, "oidc");
    assert.equal(ctx.userId, "google-abc"); // the verified person, not "demo-user"
    assert.equal(ctx.workspaceId, "myinstantai"); // tenant = brand
    delete process.env.MIAI_AUTH_MODE;
  });

  it("resolveConsumerAuth: oidc + no session => 401 (sign-in required)", async () => {
    process.env.MIAI_AUTH_MODE = "oidc";
    await assert.rejects(
      () =>
        cauth.resolveConsumerAuth(
          new Request("https://app.test/api/consumer/chat?workspaceId=myinstantai"),
        ),
      (e) => {
        assert.equal(e.status, 401);
        return true;
      },
    );
    delete process.env.MIAI_AUTH_MODE;
  });

  it("two people get two identities (memory keys differ)", async () => {
    process.env.MIAI_AUTH_MODE = "oidc";
    const a = await cauth.resolveConsumerAuth(
      reqWithCookie(session.SESSION_COOKIE, await session.signSession({ sub: "person-A" })),
    );
    const b = await cauth.resolveConsumerAuth(
      reqWithCookie(session.SESSION_COOKIE, await session.signSession({ sub: "person-B" })),
    );
    assert.notEqual(a.userId, b.userId);
    delete process.env.MIAI_AUTH_MODE;
  });
});

describe("safeReturnPath (open-redirect guard)", () => {
  let oidc;
  const savedBase = {};
  before(async () => {
    for (const k of ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"]) savedBase[k] = process.env[k];
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_BASE_URL; // appBaseUrl() defaults to http://localhost:3000
    oidc = await import("../src/lib/consumer-oidc.ts");
  });
  after(() => {
    for (const [k, v] of Object.entries(savedBase)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const cases = [
    ["/me", "/me"],
    ["/personal/study-coach?x=1", "/personal/study-coach?x=1"],
    [null, "/me"],
    ["", "/me"],
    ["//evil.com", "/me"], // protocol-relative
    ["/\\evil.com", "/me"], // backslash bypass — the vuln the review caught
    ["/\\\\evil.com", "/me"],
    ["https://evil.com/x", "/me"], // absolute cross-origin
    ["http://evil.com", "/me"],
    ["javascript:alert(1)", "/me"], // non-http scheme
    ["http://localhost:3000/ok?a=1", "/ok?a=1"], // same-origin absolute → reduced to its path
    ["/..//evil.com", "/me"], // dot-segment collapses to same-origin pathname //evil.com (2nd bypass)
    ["/..//..//evil.com", "/me"],
    ["http://localhost:3000//evil.com", "/me"], // same-origin absolute whose path is //evil.com
    ["http://localhost:3000/\\evil.com", "/me"], // backslash in same-origin absolute
    ["/a//b", "/a//b"], // legit same-origin path with // in the middle still passes
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} => ${expected}`, () => {
      assert.equal(oidc.safeReturnPath(input), expected);
    });
  }
});
