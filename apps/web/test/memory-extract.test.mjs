/**
 * Passive memory extraction — the high-precision heuristics that let the assistant remember durable
 * self-facts the user didn't explicitly ask it to keep. Pure; no DOM, no network. Precision matters
 * more than recall here, so the "does NOT extract" cases are as important as the positive ones.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

let ex;
before(async () => {
  ex = await import("../src/lib/memory-extract.ts");
});

const contents = (text) => ex.extractDurableFacts(text).map((f) => f.content);

describe("extractDurableFacts — captures durable self-facts", () => {
  it("dietary preference", () => {
    assert.deepEqual(contents("oh btw I'm vegetarian these days"), ["vegetarian"]);
  });
  it("name (capitalised, not 'call me later')", () => {
    assert.deepEqual(contents("you can call me Sam"), ["name is Sam"]);
    assert.deepEqual(contents("call me later please"), []);
  });
  it("where they live", () => {
    assert.deepEqual(contents("I live in Lisbon now"), ["lives in Lisbon"]);
  });
  it("where they work", () => {
    assert.deepEqual(contents("I work at Acme Corp"), ["works at Acme Corp"]);
  });
  it("allergies", () => {
    assert.deepEqual(contents("just so you know I'm allergic to peanuts"), ["allergic to peanuts"]);
  });
  it("my X is Y attribute", () => {
    assert.deepEqual(contents("my dentist is Dr Khan"), ["my dentist is Dr Khan"]);
  });
  it("tags each fact with a category", () => {
    const facts = ex.extractDurableFacts("I'm vegan");
    assert.equal(facts[0].category, "preferences");
  });
});

describe("extractDurableFacts — precision guards (does NOT extract)", () => {
  it("rhetoric 'my point is …'", () => {
    assert.deepEqual(contents("my point is that we should leave early"), []);
  });
  it("clause values 'my plan is to …'", () => {
    assert.deepEqual(contents("my plan is to travel next year"), []);
  });
  it("secrets — PIN / long digit runs", () => {
    assert.deepEqual(contents("my pin is 4821"), []);
    assert.deepEqual(contents("my card is 4111 1111 1111 1111"), []);
  });
  it("questions that mention 'my'", () => {
    assert.deepEqual(contents("what is my current balance?"), []);
  });
  it("plain generic role claims (kept out to avoid noise)", () => {
    assert.deepEqual(contents("I'm a bit tired today"), []);
  });
  it("ignores empty and overly long input", () => {
    assert.deepEqual(contents(""), []);
    assert.deepEqual(contents("x".repeat(700)), []);
  });
  it("caps at two facts per message", () => {
    const many = "I'm vegetarian, I live in Lisbon, I work at Acme, call me Sam";
    assert.ok(ex.extractDurableFacts(many).length <= 2);
  });
});
