/**
 * Business Google-SSO auth: the invite allowlist (fail-closed), the signed session cookie, and the
 * resolveAuth session-cookie branch that gives each verified Google user OWNER of their OWN isolated
 * workspace. Runs against the file-backed member store (no DATABASE_URL) with a temp path.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP_MEMBERS = path.join(os.tmpdir(), `miai-b2b-members-${process.pid}.json`);
const saved = {};
let allowlist, session, auth, members, paths;

before(async () => {
  for (const k of [
    "MIAI_AUTH_MODE",
    "MIAI_SESSION_SECRET",
    "OAUTH_TOKEN_SECRET",
    "MIAI_B2B_ALLOWED_EMAILS",
    "MIAI_B2B_ALLOWED_DOMAINS",
    "WORKSPACE_MEMBERS_PATH",
    "DATABASE_URL",
    "NODE_ENV",
  ]) {
    saved[k] = process.env[k];
  }
  process.env.MIAI_AUTH_MODE = "oidc";
  process.env.MIAI_SESSION_SECRET = "test-session-secret-0123456789abcdef";
  process.env.WORKSPACE_MEMBERS_PATH = TMP_MEMBERS;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  allowlist = await import("../src/lib/business-allowlist.ts");
  session = await import("../src/lib/business-session.ts");
  auth = await import("../src/lib/auth.ts");
  members = await import("../src/lib/workspace-members.ts");
  paths = await import("../src/lib/public-paths.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(TMP_MEMBERS, { force: true });
});

function reqWithSession(token) {
  return new Request("https://example.com/api/rent", {
    headers: token ? { cookie: `miai_business_session=${token}` } : {},
  });
}

describe("business allowlist (invite-only, fail-closed)", () => {
  it("denies everyone when neither allowlist var is set", () => {
    delete process.env.MIAI_B2B_ALLOWED_EMAILS;
    delete process.env.MIAI_B2B_ALLOWED_DOMAINS;
    assert.equal(allowlist.isBusinessEmailAllowed("a@acme.com", true), false);
  });

  it("admits an exact email and a matching domain incl. subdomains", () => {
    process.env.MIAI_B2B_ALLOWED_EMAILS = "ceo@acme.com";
    process.env.MIAI_B2B_ALLOWED_DOMAINS = "partner.co";
    assert.equal(allowlist.isBusinessEmailAllowed("ceo@acme.com", true), true);
    assert.equal(allowlist.isBusinessEmailAllowed("anyone@partner.co", true), true);
    assert.equal(allowlist.isBusinessEmailAllowed("eu@team.partner.co", true), true);
  });

  it("rejects unverified emails, non-listed addresses, and domain-suffix spoofs", () => {
    process.env.MIAI_B2B_ALLOWED_DOMAINS = "acme.com";
    delete process.env.MIAI_B2B_ALLOWED_EMAILS;
    assert.equal(allowlist.isBusinessEmailAllowed("x@acme.com", false), false); // unverified
    assert.equal(allowlist.isBusinessEmailAllowed("x@evil.com", true), false); // not listed
    assert.equal(allowlist.isBusinessEmailAllowed("notanemail", true), false); // malformed
    assert.equal(allowlist.isBusinessEmailAllowed("x@notacme.com", true), false); // suffix spoof
  });
});

describe("business session cookie", () => {
  it("round-trips a signed identity and rejects tampering / absence", async () => {
    const token = await session.signBusinessSession({
      sub: "google-123",
      email: "a@acme.com",
      name: "A",
    });
    const ok = await session.readBusinessSession(reqWithSession(token));
    assert.equal(ok?.sub, "google-123");
    assert.equal(ok?.email, "a@acme.com");
    assert.equal(await session.readBusinessSession(reqWithSession(`${token}x`)), null);
    assert.equal(await session.readBusinessSession(reqWithSession(null)), null);
  });
});

describe("resolveAuth business-session branch (isolation + owner)", () => {
  // Self-contained: every identity in this block is on the acme.com allowlist, so resolveAuth's
  // per-request offboarding re-check admits them (rather than leaning on a prior block's env).
  before(() => {
    process.env.MIAI_B2B_ALLOWED_DOMAINS = "acme.com";
    delete process.env.MIAI_B2B_ALLOWED_EMAILS;
  });

  it("resolves a cookie to owner of its own per-user workspace, mode oidc", async () => {
    const token = await session.signBusinessSession({ sub: "google-abc", email: "owner@acme.com" });
    const ctx = await auth.resolveAuth(reqWithSession(token));
    assert.equal(ctx.mode, "oidc");
    assert.equal(ctx.via, "cookie");
    assert.equal(ctx.userId, "google-abc");
    assert.equal(ctx.workspaceId, "ws_google-abc");
    assert.deepEqual(ctx.roles, ["owner"]);
    // provisioning persisted the owner membership
    assert.equal(await members.roleFromMembers("ws_google-abc", "google-abc"), "owner");
  });

  it("gives two different identities different workspaces (no collision)", async () => {
    const t1 = await session.signBusinessSession({ sub: "user-1", email: "a@acme.com" });
    const t2 = await session.signBusinessSession({ sub: "user-2", email: "b@acme.com" });
    const c1 = await auth.resolveAuth(reqWithSession(t1));
    const c2 = await auth.resolveAuth(reqWithSession(t2));
    assert.equal(c1.workspaceId, "ws_user-1");
    assert.equal(c2.workspaceId, "ws_user-2");
    assert.notEqual(c1.workspaceId, c2.workspaceId);
  });

  it("a stranger cannot become owner of someone else's workspace", async () => {
    // user-1's workspace already provisioned above; a different verified user gets readonly/null there.
    assert.equal(await members.roleFromMembers("ws_user-1", "user-2"), null);
  });

  it("offboards a removed user: a valid cookie whose email left the allowlist is denied", async () => {
    // The person signed in while allowlisted; their 30-day cookie is still cryptographically valid.
    const token = await session.signBusinessSession({ sub: "gone", email: "gone@ex-partner.com" });
    // ex-partner.com is not on the acme.com allowlist -> the per-request re-check must deny the stale
    // cookie (fall through to the Bearer path), rather than re-provisioning them as owner.
    await assert.rejects(() => auth.resolveAuth(reqWithSession(token)), /Missing Bearer token/);
    assert.equal(await members.roleFromMembers("ws_gone", "gone"), null, "no owner row resurrected");
  });

  it("ignores forged workspace/user/role headers on a valid cookie (per-user isolation)", async () => {
    const token = await session.signBusinessSession({ sub: "self", email: "self@acme.com" });
    const req = new Request("https://example.com/api/rent", {
      headers: {
        cookie: `miai_business_session=${token}`,
        "x-workspace-id": "ws_victim",
        "x-user-id": "victim",
        "x-roles": "owner,operator",
      },
    });
    const ctx = await auth.resolveAuth(req);
    assert.equal(ctx.workspaceId, "ws_self", "workspace pinned to the verified sub, not the header");
    assert.equal(ctx.userId, "self", "user pinned to the verified sub, not the header");
    assert.deepEqual(ctx.roles, ["owner"], "no operator/platform role smuggled via x-roles");
  });

  it("falls through to the Bearer 401 when there is no session cookie", async () => {
    await assert.rejects(
      () => auth.resolveAuth(new Request("https://example.com/api/rent")),
      /Missing Bearer token/,
    );
  });
});

describe("business page gate (opt-in, safe direction)", () => {
  it("gates the console pages and the studio, but not the hub/embed/public pages", () => {
    // gated business console pages + the studio
    for (const p of ["/my-agents", "/workspace", "/ops", "/insights", "/create", "/agents/us-hotel-guest"]) {
      assert.equal(paths.isGatedBusinessPage(p), true, `${p} should be gated`);
    }
    // open: the /agents hub, the embed asset, public/consumer pages, and all API paths
    for (const p of ["/agents", "/agents/v1/agent.js", "/", "/login", "/get-started", "/me", "/api/rent"]) {
      assert.equal(paths.isGatedBusinessPage(p), false, `${p} should NOT be gated`);
    }
  });
});
