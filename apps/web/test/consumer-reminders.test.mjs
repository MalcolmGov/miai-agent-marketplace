/**
 * In-app reminders store — tenant-scoped like the rest of consumer memory. Runs against the JSON
 * file fallback (no DATABASE_URL), so it's hermetic. Covers create/list ordering, tenant isolation
 * (the same phone number under two brands must not bleed), and dismiss for one-off vs recurring.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const STORE = path.join(os.tmpdir(), `miai-reminders-${process.pid}.json`);
const saved = {};
let mem;

const owner = (t, c) => ({ tenantId: t, consumerId: c });
const NOW = new Date(2026, 7, 21, 10, 0, 0, 0); // local Fri Aug 21 2026 10:00

before(async () => {
  for (const k of ["CONSUMER_REMINDERS_STORE_PATH", "DATABASE_URL", "NODE_ENV"]) saved[k] = process.env[k];
  process.env.CONSUMER_REMINDERS_STORE_PATH = STORE;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  mem = await import("../src/lib/consumer-reminders-store.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(STORE, { force: true });
});

describe("consumer reminders store", () => {
  it("saves reminders and lists them soonest-first", async () => {
    const o = owner("miai", "u1");
    await mem.setReminder(o, { text: "call the dentist", when: "in 2 hours" }, NOW);
    await mem.setReminder(o, { text: "take meds", when: "in 30 minutes" }, NOW);
    const list = await mem.listReminders(o);
    assert.equal(list.length, 2);
    assert.equal(list[0].text, "take meds", "sooner reminder first");
    assert.equal(list[1].text, "call the dentist");
    assert.match(list[0].firesAt, /2026-08-21T/);
  });

  it("stays owner-scoped (same phone under two brands)", async () => {
    await mem.setReminder(owner("vodacom", "27821"), { text: "vodacom reminder", when: "in 1 hour" }, NOW);
    await mem.setReminder(owner("mtn", "27821"), { text: "mtn reminder", when: "in 1 hour" }, NOW);
    const voda = await mem.listReminders(owner("vodacom", "27821"));
    assert.ok(voda.some((r) => r.text === "vodacom reminder"));
    assert.ok(!voda.some((r) => r.text === "mtn reminder"), "no cross-tenant bleed");
  });

  it("dismisses a one-off reminder", async () => {
    const o = owner("miai", "u2");
    const { id } = await mem.setReminder(o, { text: "one-off", when: "in 1 hour" }, NOW);
    assert.equal(await mem.dismissReminder(o, id), true);
    const list = await mem.listReminders(o);
    assert.ok(!list.some((r) => r.id === id), "gone after dismiss");
  });

  it("rolls a recurring reminder forward instead of removing it", async () => {
    const o = owner("miai", "u3");
    const { id, firesAt, recurring } = await mem.setReminder(o, { text: "meds", when: "every day at 7am" }, NOW);
    assert.equal(recurring, "daily");
    const after = new Date(Date.parse(firesAt) + 60_000);
    assert.equal(await mem.dismissReminder(o, id, after), true);
    const r = (await mem.listReminders(o)).find((x) => x.id === id);
    assert.ok(r, "still pending");
    assert.ok(Date.parse(r.firesAt) > Date.parse(firesAt), "advanced to the next occurrence");
  });

  it("ignores an invalid owner", async () => {
    assert.equal((await mem.setReminder(owner("miai", ""), { text: "x", when: "in 1 hour" })).saved, false);
    assert.deepEqual(await mem.listReminders(owner("", "u")), []);
  });
});
