/**
 * Life-graph memory: goals + people stores (create/update/dedupe/list/forget, tenant isolation)
 * and their system-prompt block builders. File-backed; no DATABASE_URL, no network.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

const GOALS = path.join(os.tmpdir(), `miai-goals-${process.pid}.json`);
const PEOPLE = path.join(os.tmpdir(), `miai-people-${process.pid}.json`);
const saved = {};
let lg;

const owner = (tenantId, consumerId) => ({ tenantId, consumerId });

before(async () => {
  for (const k of ["CONSUMER_GOALS_STORE_PATH", "CONSUMER_PEOPLE_STORE_PATH", "DATABASE_URL", "NODE_ENV"]) {
    saved[k] = process.env[k];
  }
  process.env.CONSUMER_GOALS_STORE_PATH = GOALS;
  process.env.CONSUMER_PEOPLE_STORE_PATH = PEOPLE;
  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "test";
  lg = await import("../src/lib/consumer-lifegraph-store.ts");
});

after(async () => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  await fs.rm(GOALS, { force: true });
  await fs.rm(PEOPLE, { force: true });
});

describe("goals", () => {
  it("creates a goal and reads it back", async () => {
    const o = owner("miai", "alice");
    const res = await lg.setGoal(o, { title: "Run a half marathon", target: "21 km", progress: 20 });
    assert.equal(res.saved, true);
    assert.ok(res.id);
    const goals = await lg.listGoals(o);
    assert.equal(goals.length, 1);
    assert.equal(goals[0].title, "Run a half marathon");
    assert.equal(goals[0].progress, 20);
  });

  it("updates progress on the same goal without duplicating, and preserves unset fields", async () => {
    const o = owner("miai", "alice");
    const first = await lg.setGoal(o, { title: "Run a half marathon", progress: 55 });
    const goals = await lg.listGoals(o);
    assert.equal(goals.length, 1, "still one goal");
    assert.equal(goals[0].id, first.id);
    assert.equal(goals[0].progress, 55, "progress updated");
    assert.equal(goals[0].target, "21 km", "target preserved when not resent");
  });

  it("clamps progress to 0-100", async () => {
    const o = owner("miai", "clamp");
    await lg.setGoal(o, { title: "Over", progress: 250 });
    await lg.setGoal(o, { title: "Under", progress: -10 });
    const byTitle = Object.fromEntries((await lg.listGoals(o)).map((g) => [g.title, g.progress]));
    assert.equal(byTitle["Over"], 100);
    assert.equal(byTitle["Under"], 0);
  });

  it("isolates the same consumer id across tenants", async () => {
    const phone = "27821234567";
    await lg.setGoal(owner("vodafone", phone), { title: "Save R20k" });
    await lg.setGoal(owner("mtn", phone), { title: "Learn guitar" });
    assert.deepEqual((await lg.listGoals(owner("vodafone", phone))).map((g) => g.title), ["Save R20k"]);
    assert.deepEqual((await lg.listGoals(owner("mtn", phone))).map((g) => g.title), ["Learn guitar"]);
  });

  it("block shows only active goals with progress/target/deadline", () => {
    const block = lg.buildGoalsBlock([
      { id: "1", title: "Run a half marathon", detail: "", target: "21 km", progress: 40, deadline: "June", status: "active", createdAt: "", updatedAt: "" },
      { id: "2", title: "Old goal", detail: "", target: "", progress: 100, deadline: "", status: "done", createdAt: "", updatedAt: "" },
    ]);
    assert.match(block, /Their goals/);
    assert.match(block, /Run a half marathon \(40%, target: 21 km, by June\)/);
    assert.ok(!block.includes("Old goal"), "done goals are not injected");
  });

  it("empty block when no active goals", () => {
    assert.equal(lg.buildGoalsBlock([]), "");
  });
});

describe("people", () => {
  it("creates a person and updates on re-mention", async () => {
    const o = owner("miai", "alice");
    const r = await lg.rememberPerson(o, { name: "Aya", relationship: "daughter" });
    assert.equal(r.saved, true);
    const again = await lg.rememberPerson(o, { name: "aya", notes: "allergic to nuts" });
    assert.equal(again.id, r.id, "same normalized name updates the same person");
    const people = await lg.listPeople(o);
    assert.equal(people.length, 1);
    assert.equal(people[0].relationship, "daughter", "relationship preserved");
    assert.equal(people[0].notes, "allergic to nuts", "notes added");
  });

  it("isolates the same consumer id across tenants", async () => {
    const phone = "27821234567";
    await lg.rememberPerson(owner("vodafone", phone), { name: "Sam", relationship: "wife" });
    await lg.rememberPerson(owner("mtn", phone), { name: "Lee", relationship: "brother" });
    assert.deepEqual((await lg.listPeople(owner("vodafone", phone))).map((p) => p.name), ["Sam"]);
    assert.deepEqual((await lg.listPeople(owner("mtn", phone))).map((p) => p.name), ["Lee"]);
  });

  it("forgets a person by id", async () => {
    const o = owner("miai", "carol");
    const r = await lg.rememberPerson(o, { name: "Thabo", relationship: "manager" });
    assert.equal(await lg.forgetPerson(o, r.id), true);
    assert.equal((await lg.listPeople(o)).length, 0);
  });

  it("block renders name, relationship and notes", () => {
    const block = lg.buildPeopleBlock([
      { id: "1", name: "Aya", relationship: "daughter", notes: "allergic to nuts", createdAt: "", updatedAt: "" },
      { id: "2", name: "Thabo", relationship: "manager", notes: "", createdAt: "", updatedAt: "" },
    ]);
    assert.match(block, /People in their life/);
    assert.match(block, /- Aya \(daughter\) — allergic to nuts/);
    assert.match(block, /- Thabo \(manager\)/);
  });
});
