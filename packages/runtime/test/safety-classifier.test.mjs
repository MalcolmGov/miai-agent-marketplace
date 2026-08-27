import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runTurn } from "../dist/index.js";
import {
  looksLikelyEnglish,
  parseSafetyCategory,
  guardForSafetyCategory,
  SAFETY_CLASSIFIER_INSTRUCTION,
} from "../dist/guardrails.js";

// P0-8 — language-agnostic safety classifier behind the en/es/fr keyword net.

describe("looksLikelyEnglish — gates the classifier", () => {
  it("treats clear English as English (keyword net covers it)", () => {
    for (const s of ["How do I reset my password?", "I need help with my order", "what are your hours"]) {
      assert.equal(looksLikelyEnglish(s), true, s);
    }
  });
  it("treats non-English as NOT English (run the classifier)", () => {
    for (const s of [
      "Ich will nicht mehr leben.", // German, ASCII, no English function words
      "je veux mourir", // French, no accents
      "¿Cómo restablezco mi contraseña?", // accented
      "我想结束我的生命", // Chinese (non-Latin)
      "أريد أن أنهي حياتي", // Arabic (non-Latin)
      "मुझे मदद चाहिए", // Hindi (non-Latin)
    ]) {
      assert.equal(looksLikelyEnglish(s), false, s);
    }
  });
});

describe("parseSafetyCategory", () => {
  it("extracts the category from clean or noisy output", () => {
    assert.equal(parseSafetyCategory("self_harm"), "self_harm");
    assert.equal(parseSafetyCategory("The category is: medical_emergency."), "medical_emergency");
    assert.equal(parseSafetyCategory("physical hazard"), "physical_hazard");
    assert.equal(parseSafetyCategory("secret_disclosure\n"), "secret_disclosure");
    assert.equal(parseSafetyCategory("none"), "none");
    assert.equal(parseSafetyCategory("hello there"), "none");
    assert.equal(parseSafetyCategory(""), "none");
  });
});

describe("guardForSafetyCategory — reuses handoff / refusal", () => {
  const tools = [{ name: "handoff_to_human" }];
  const system = "Emergencies: call **112** now.";

  it("self_harm / medical_emergency → emergency handoff", () => {
    for (const c of ["self_harm", "medical_emergency"]) {
      const r = guardForSafetyCategory(c, "msg", system, tools);
      assert.equal(r.toolCall.name, "handoff_to_human");
      assert.equal(r.toolCall.args.reason, "emergency");
      assert.match(r.content, /112|emergency|human/i);
    }
  });
  it("physical_hazard → safety_emergency handoff", () => {
    const r = guardForSafetyCategory("physical_hazard", "msg", system, tools);
    assert.equal(r.toolCall.args.reason, "safety_emergency");
  });
  it("secret_disclosure → refusal, no handoff", () => {
    const r = guardForSafetyCategory("secret_disclosure", "msg", system, tools);
    assert.equal(r.toolCall, undefined);
    assert.match(r.content, /card|OTP|password|PIN/i);
  });
  it("none → null (continue to the model)", () => {
    assert.equal(guardForSafetyCategory("none", "msg", system, tools), null);
  });
});

describe("classifier integration in runTurn (P0-8)", () => {
  const basePkg = {
    format: "miai.agent-package/v1",
    manifest: {
      id: "safety-test-agent",
      name: "Safety Test",
      category: "front-office",
      channels: ["web"],
      model: { primary: "claude-sonnet", temperature: 0.2, max_output_tokens: 300 },
      version: "1.0.0",
    },
    system_prompt: "You are a test agent. Emergencies: call **112** now.",
    knowledge: "## KB\nNothing relevant.",
    tools: [
      { name: "handoff_to_human", description: "Route to a human.", parameters: { type: "object", properties: {} }, side_effects: "write" },
    ],
    guardrails: "Stay in role.",
    evals: [],
  };
  function recordingModel(reply) {
    const systems = [];
    return { systems, async complete(input) { systems.push(input.system); return { content: reply }; } };
  }
  const wallet = {
    async getBalance() { return { workspaceId: "ws", tokens: 1000, currencyLabel: "tokens" }; },
    async debit() { return { ok: true, balance: 900, paused: false }; },
    async topUp() { return { workspaceId: "ws", tokens: 1000, currencyLabel: "tokens" }; },
  };
  function req(userMessage) {
    return { workspaceId: "ws", agentId: "safety-test-agent", pkg: basePkg, messages: [], userMessage, model: "claude-sonnet", mode: "live", state: "rented" };
  }

  it("German self-harm (missed by the keyword net) → classifier fires → emergency response", async () => {
    const model = recordingModel("self_harm");
    const r = await runTurn(req("Ich will nicht mehr leben."), { wallet, model });
    assert.ok(
      model.systems.includes(SAFETY_CLASSIFIER_INSTRUCTION),
      "the safety classifier should have been invoked",
    );
    assert.match(r.assistantMessage, /112|emergency|life-threatening|human/i);
  });

  it("clear English is NOT sent to the classifier (keyword net covers en)", async () => {
    const model = recordingModel("some normal answer");
    await runTurn(req("How do I reset my password?"), { wallet, model });
    assert.equal(
      model.systems.includes(SAFETY_CLASSIFIER_INSTRUCTION),
      false,
      "classifier must be skipped for confident English",
    );
  });
});
