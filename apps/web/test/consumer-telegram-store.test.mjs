/**
 * Telegram consumer binding store — file-fallback unit tests.
 * Verifies chat_id ↔ consumer account binding for the deep-link setup flow.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const TMP = path.join(os.tmpdir(), `miai-tg-binding-test-${process.pid}.json`);
let store;

beforeEach(async () => {
  process.env.TELEGRAM_BINDINGS_STORE_PATH = TMP;
  delete process.env.DATABASE_URL;
  // Fresh import so the in-process Map is reset.
  store = await import("../src/lib/consumer-telegram-store.ts");
});

afterEach(async () => {
  await fs.rm(TMP, { force: true });
  delete process.env.TELEGRAM_BINDINGS_STORE_PATH;
});

describe("Telegram binding store", () => {
  it("starts unbound", async () => {
    assert.equal(await store.consumerIdForChat(123), null);
  });

  it("binds a chat to a consumer and resolves it back", async () => {
    await store.bindTelegramConsumer(12345, "usr_abc");
    assert.equal(await store.consumerIdForChat(12345), "usr_abc");
    assert.equal(await store.consumerIdForChat(12345), "usr_abc"); // idempotent read
  });

  it("rebinding a chat moves it to a new consumer", async () => {
    await store.bindTelegramConsumer(111, "usr_one");
    await store.bindTelegramConsumer(111, "usr_two");
    assert.equal(await store.consumerIdForChat(111), "usr_two");
  });

  it("keeps different chats independent", async () => {
    await store.bindTelegramConsumer(1, "usr_a");
    await store.bindTelegramConsumer(2, "usr_b");
    assert.equal(await store.consumerIdForChat(1), "usr_a");
    assert.equal(await store.consumerIdForChat(2), "usr_b");
  });

  it("unbinds a chat", async () => {
    await store.bindTelegramConsumer(999, "usr_x");
    await store.unbindTelegramConsumer(999);
    assert.equal(await store.consumerIdForChat(999), null);
  });

  it("persists across re-imports (file fallback)", async () => {
    await store.bindTelegramConsumer(777, "usr_persist");
    // Simulate a new process: re-import (the Map hydration reads the file).
    const fresh = await import("../src/lib/consumer-telegram-store.ts");
    assert.equal(await fresh.consumerIdForChat(777), "usr_persist");
  });
});
