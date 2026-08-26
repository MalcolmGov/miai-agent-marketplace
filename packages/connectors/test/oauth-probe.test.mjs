import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  probeSupportedConnectors,
  saveToken,
  listTokenMeta,
  verifyConnector,
} from "../dist/index.js";

describe("oauth probe registry", () => {
  it("covers Phase-1 OAuth connectors", () => {
    const ids = probeSupportedConnectors();
    for (const id of ["slack", "google_calendar", "hubspot", "email"]) {
      assert.ok(ids.includes(id), `missing probe for ${id}`);
    }
  });
});

describe("verifyConnector — records the live probe result on the token", () => {
  const storeFile = path.join(os.tmpdir(), `miai-oauth-verify-${process.pid}.json`);
  const realFetch = globalThis.fetch;

  before(() => {
    process.env.OAUTH_TOKEN_STORE_PATH = storeFile;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    await fs.rm(storeFile, { force: true });
  });

  function stubSlack(ok, error) {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => (ok ? { ok: true, user: "u", team: "acme" } : { ok: false, error }),
    });
  }

  async function saveSlack() {
    await saveToken({
      connectorId: "slack",
      workspaceId: "ws-v",
      accessToken: "fake-access-token",
      expiresAt: Date.now() + 3_600_000, // far future → no refresh attempt
      meta: {},
      updatedAt: new Date().toISOString(),
    });
  }

  it("marks a working token verified:true with the account", async () => {
    await saveSlack();
    stubSlack(true);
    const res = await verifyConnector("ws-v", "slack");
    assert.equal(res.ok, true);
    const meta = (await listTokenMeta("ws-v")).find((m) => m.connectorId === "slack");
    assert.equal(meta?.verified, true);
    assert.ok(meta?.verifiedAt, "verifiedAt recorded");
  });

  it("marks a broken token verified:false with the error", async () => {
    await saveSlack();
    stubSlack(false, "invalid_auth");
    const res = await verifyConnector("ws-v", "slack");
    assert.equal(res.ok, false);
    const meta = (await listTokenMeta("ws-v")).find((m) => m.connectorId === "slack");
    assert.equal(meta?.verified, false);
    assert.equal(meta?.verifyError, "invalid_auth");
  });
});
