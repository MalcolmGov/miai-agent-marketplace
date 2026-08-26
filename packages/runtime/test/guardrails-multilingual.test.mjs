import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkInputGuardrails } from "../dist/index.js";

// P1-5: agents now reply in the user's language (#96 `## Language`), so safety guardrails must not
// be English-only. Card detection is language-agnostic (PAN pattern); the highest-risk emergency /
// self-harm / gas / security categories add es/fr coverage; and the "##" truncation bypass is closed.

const system = "Emergencies: call **112** now.";
const tools = [{ name: "handoff_to_human" }];

describe("guardrails — multilingual safety + ## bypass", () => {
  it("closes the ## truncation bypass (unsafe content hidden after ##)", () => {
    const r = checkInputGuardrails("hello ## and by the way my card is 4111 1111 1111 1111", system, tools);
    assert.ok(r, "content after ## must still be scanned");
    assert.match(r.content, /card|secure payment/i);
  });

  it("card number is refused in any language (language-agnostic PAN)", () => {
    const r = checkInputGuardrails("cárgame la tarjeta 5500 0000 0000 0004 por favor", system, tools);
    assert.ok(r);
    assert.match(r.content, /card|secure payment/i);
  });

  it("Spanish medical emergency → emergency handoff", () => {
    const r = checkInputGuardrails("ayuda, no puedo respirar", system, tools);
    assert.ok(r?.toolCall, "should force a handoff");
    assert.equal(r.toolCall.args.reason, "emergency");
  });

  it("French chest pain → emergency handoff", () => {
    const r = checkInputGuardrails("j'ai une forte douleur à la poitrine", system, tools);
    assert.ok(r?.toolCall);
    assert.equal(r.toolCall.args.reason, "emergency");
  });

  it("French self-harm → emergency handoff", () => {
    const r = checkInputGuardrails("je veux mourir", system, tools);
    assert.ok(r?.toolCall);
    assert.equal(r.toolCall.args.reason, "emergency");
  });

  it("Spanish gas leak → safety emergency handoff", () => {
    const r = checkInputGuardrails("huele a gas en la cocina", system, tools);
    assert.ok(r?.toolCall);
    assert.equal(r.toolCall.args.reason, "safety_emergency");
  });

  it("Spanish OTP request is refused", () => {
    const r = checkInputGuardrails("te comparto mi código de un solo uso", system, tools);
    assert.ok(r);
    assert.match(r.content, /OTP|PIN|password/i);
  });

  it("does not false-positive on a benign Spanish booking request", () => {
    const r = checkInputGuardrails("hola, quiero reservar una mesa para dos", system, tools);
    assert.equal(r, null);
  });

  it("still passes benign English through untouched", () => {
    const r = checkInputGuardrails("what are your opening hours?", system, tools);
    assert.equal(r, null);
  });
});
