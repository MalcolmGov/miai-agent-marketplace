/**
 * Consumer connector wiring: which connectors the consumer line needs, the connect allowlist,
 * and that connector tokens store + isolate per consumer id (the key the runtime uses to run a
 * consumer's tools live). Uses a temp token store; no DATABASE_URL, no network.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP = path.join(os.tmpdir(), `miai-consumer-conn-${process.pid}.json`);
const saved = {};
let cc;
let connectors;

before(async () => {
  for (const k of ["OAUTH_TOKEN_STORE_PATH", "DATABASE_URL", "NODE_ENV", "OAUTH_TOKEN_SECRET"]) {
    saved[k] = process.env[k];
  }
  process.env.OAUTH_TOKEN_STORE_PATH = TMP;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  process.env.OAUTH_TOKEN_SECRET = "test-oauth-secret-0123456789abcdef";
  cc = await import("../src/lib/consumer-connectors.ts");
  connectors = await import("@miai/connectors");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(TMP, { force: true });
});

describe("consumer connector needs + allowlist", () => {
  it("derives the OAuth connectors the personal assistant needs", () => {
    assert.deepEqual(
      [...cc.consumerOAuthConnectors()].sort(),
      ["email", "google_calendar", "google_contacts", "google_drive", "google_tasks"],
    );
  });

  it("allows only OAuth connectors a consumer agent actually uses", () => {
    assert.equal(cc.isConsumerConnector("email"), true);
    assert.equal(cc.isConsumerConnector("google_calendar"), true);
    assert.equal(cc.isConsumerConnector("slack"), false, "not used by a consumer agent");
    assert.equal(cc.isConsumerConnector("shopify"), false);
    assert.equal(cc.isConsumerConnector("webhook"), false, "webhook is internal, not OAuth");
    assert.equal(cc.isConsumerConnector("nonsense"), false);
  });
});

describe("consumer connector tokens (keyed by consumer id)", () => {
  it("stores + lists a consumer's token and isolates it from other consumers", async () => {
    await connectors.saveToken({
      connectorId: "email",
      workspaceId: "alice",
      accessToken: "tok-alice",
      meta: {},
      updatedAt: new Date().toISOString(),
    });

    assert.ok((await connectors.listConnected("alice")).includes("email"));
    assert.equal((await connectors.listTokenMeta("bob")).length, 0, "another consumer sees nothing");
  });

  it("drives the connect status the /connectors route reports", async () => {
    const meta = await connectors.listTokenMeta("alice");
    const connectedIds = new Set(meta.map((m) => m.connectorId));
    const status = cc.consumerOAuthConnectors().map((connector) => ({
      connector,
      connected: connectedIds.has(connector),
    }));
    assert.equal(status.find((s) => s.connector === "email").connected, true);
    assert.equal(status.find((s) => s.connector === "google_calendar").connected, false);
    assert.equal(
      status.every((s) => s.connected),
      false,
      "not fully connected until calendar is linked too",
    );
  });

  it("disconnect removes the consumer's token", async () => {
    await connectors.saveToken({
      connectorId: "google_calendar",
      workspaceId: "carol",
      accessToken: "tok",
      meta: {},
      updatedAt: new Date().toISOString(),
    });
    assert.ok((await connectors.listConnected("carol")).includes("google_calendar"));
    await connectors.deleteToken("carol", "google_calendar");
    assert.equal((await connectors.listConnected("carol")).includes("google_calendar"), false);
  });
});
