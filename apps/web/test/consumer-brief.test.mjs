/**
 * Consumer daily brief: timezone-aware due logic, the config store, and generation (metered to
 * the consumer's wallet). File-backed store + mock model/wallet; no DATABASE_URL, no network.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = path.resolve(DIR, "../../../data/catalog");
const BRIEF = path.join(os.tmpdir(), `miai-brief-${process.pid}.json`);
const RENTALS = path.join(os.tmpdir(), `miai-brief-rentals-${process.pid}.json`);
const saved = {};
let brief;
let store;
let wallet;

// A fixed instant: 05:00 UTC → 07:00 in Johannesburg (UTC+2), 01:00 in New York (UTC-4, DST).
const NOW = new Date("2026-08-20T05:00:00Z");

before(async () => {
  for (const k of [
    "BRIEF_STORE_PATH", "RENTAL_STORE_PATH", "CATALOG_DIR",
    "DATABASE_URL", "MIAI_MODEL_MODE", "MIAI_WALLET_MODE", "NODE_ENV",
  ]) {
    saved[k] = process.env[k];
  }
  process.env.BRIEF_STORE_PATH = BRIEF;
  process.env.RENTAL_STORE_PATH = RENTALS;
  process.env.CATALOG_DIR = CATALOG;
  delete process.env.DATABASE_URL;
  delete process.env.MIAI_MODEL_MODE;
  delete process.env.MIAI_WALLET_MODE;
  process.env.NODE_ENV = "test";
  brief = await import("../src/lib/consumer-brief.ts");
  store = await import("../src/lib/consumer-brief-store.ts");
  wallet = await import("@miai/wallet-adapter");
  wallet.resetWalletAdapterForTests();
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(BRIEF, { force: true });
  await fs.rm(RENTALS, { force: true });
});

describe("localDateHour + isBriefDue", () => {
  it("resolves the consumer's local date and hour", () => {
    assert.deepEqual(brief.localDateHour(NOW, "Africa/Johannesburg"), { date: "2026-08-20", hour: 7 });
    assert.deepEqual(brief.localDateHour(NOW, "America/New_York"), { date: "2026-08-20", hour: 1 });
  });

  it("is due only when enabled, at the local hour, and not already sent today", () => {
    const cfg = { enabled: true, hour: 7, timezone: "Africa/Johannesburg", channel: "app" };
    assert.equal(brief.isBriefDue(cfg, null, NOW), true);
    assert.equal(brief.isBriefDue({ ...cfg, enabled: false }, null, NOW), false, "disabled");
    assert.equal(brief.isBriefDue({ ...cfg, hour: 8 }, null, NOW), false, "wrong hour");
    assert.equal(brief.isBriefDue(cfg, "2026-08-20", NOW), false, "already sent today");
    assert.equal(brief.isBriefDue(cfg, "2026-08-19", NOW), true, "sent yesterday → due again");
    assert.equal(brief.isBriefDue({ ...cfg, timezone: "Not/AZone" }, null, NOW), false, "bad tz");
  });
});

describe("brief config store", () => {
  it("stores + reads a consumer's schedule and isolates consumers", async () => {
    const cfg = { enabled: true, hour: 6, timezone: "Europe/Madrid", channel: "whatsapp" };
    await store.setBriefConfig("alice", cfg);
    const rec = await store.getBriefRecord("alice");
    assert.deepEqual(rec.config, cfg);
    assert.equal(rec.latest, null);

    const other = await store.getBriefRecord("bob");
    assert.equal(other.config.enabled, false, "another consumer gets the disabled default");
  });

  it("records the latest brief + last-sent date", async () => {
    await store.recordBriefSent(
      "alice",
      { text: "Morning!", generatedAt: NOW.toISOString(), tokensDebited: 10 },
      "2026-08-20",
    );
    const rec = await store.getBriefRecord("alice");
    assert.equal(rec.latest.text, "Morning!");
    assert.equal(rec.lastSentOn, "2026-08-20");
    assert.equal(rec.config.enabled, true, "config preserved through a sent-record write");
  });
});

describe("generateDailyBrief + runDueBriefs", () => {
  it("generates a brief, meters the wallet, and marks it sent for today", async () => {
    wallet.resetWalletAdapterForTests();
    const before = (await wallet.createWalletAdapter().getBalance("carol")).tokens;

    const res = await brief.generateDailyBrief("carol", NOW);
    assert.equal(res.ok, true, res.ok ? "" : `failed: ${res.error}`);
    assert.ok(res.text.length > 0);

    const afterBal = (await wallet.createWalletAdapter().getBalance("carol")).tokens;
    assert.ok(afterBal < before, "brief generation debited the consumer's wallet");

    const rec = await store.getBriefRecord("carol");
    assert.equal(rec.lastSentOn, "2026-08-20");
    // Now that it's sent, the same instant is no longer due.
    assert.equal(
      brief.isBriefDue({ enabled: true, hour: 7, timezone: "Africa/Johannesburg", channel: "app" }, rec.lastSentOn, NOW),
      false,
    );
  });

  it("sweeps only the consumers whose schedule is due now", async () => {
    await store.setBriefConfig("due-user", {
      enabled: true, hour: 7, timezone: "Africa/Johannesburg", channel: "app",
    });
    await store.setBriefConfig("notdue-user", {
      enabled: true, hour: 23, timezone: "Africa/Johannesburg", channel: "app",
    });

    const result = await brief.runDueBriefs(NOW);
    assert.ok(result.ran.includes("due-user"), "the 07:00 consumer ran");
    assert.ok(!result.ran.includes("notdue-user"), "the 23:00 consumer did not run");
  });
});
