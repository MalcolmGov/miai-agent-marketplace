import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getValidAccessToken,
  saveToken,
  getToken,
  deleteToken,
} from "../dist/index.js";

const WS = "test-ws-oauth-fail-closed";
const CONNECTOR = "google_calendar";

function sampleToken(overrides = {}) {
  return {
    connectorId: CONNECTOR,
    workspaceId: WS,
    accessToken: "access-old",
    refreshToken: "refresh-abc",
    expiresAt: Date.now() - 1000,
    tokenType: "Bearer",
    scope: "calendar",
    meta: {},
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("getValidAccessToken fail-closed", () => {
  let originalFetch;

  before(() => {
    process.env.OAUTH_TOKEN_SECRET = "test-secret-at-least-sixteen";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
    originalFetch = globalThis.fetch;
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await deleteToken(WS, CONNECTOR);
  });

  it("returns a still-valid token without refresh", async () => {
    await saveToken(
      sampleToken({
        expiresAt: Date.now() + 3600_000,
        accessToken: "access-valid",
      }),
    );
    const token = await getValidAccessToken(WS, CONNECTOR);
    assert.ok(token);
    assert.equal(token.accessToken, "access-valid");
  });

  it("returns null and deletes token when near expiry and no refreshToken", async () => {
    await saveToken(
      sampleToken({
        refreshToken: undefined,
        expiresAt: Date.now() + 30_000,
      }),
    );
    const token = await getValidAccessToken(WS, CONNECTOR);
    assert.equal(token, null);
    assert.equal(await getToken(WS, CONNECTOR), null);
  });

  it("returns null and deletes token when refresh fails", async () => {
    await saveToken(sampleToken());
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });

    const token = await getValidAccessToken(WS, CONNECTOR);
    assert.equal(token, null);
    assert.equal(await getToken(WS, CONNECTOR), null);
  });

  it("returns refreshed token when refresh succeeds", async () => {
    await saveToken(sampleToken());
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          access_token: "access-new",
          expires_in: 3600,
          refresh_token: "refresh-new",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    const token = await getValidAccessToken(WS, CONNECTOR);
    assert.ok(token);
    assert.equal(token.accessToken, "access-new");
    assert.equal(token.refreshToken, "refresh-new");
  });
});
