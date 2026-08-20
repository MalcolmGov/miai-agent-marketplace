/**
 * Azure OpenAI adapter resolution (MIAI_MODEL_MODE=azure) — the migration seam for Azure infra.
 * Verifies createModelAdapter selects the Azure adapter only when its creds are present, and
 * that the Azure endpoint/deployment/tier logic is shaped correctly. No network.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { createModelAdapter, AzureOpenAIModelAdapter } from "../dist/index.js";

const KEYS = [
  "MIAI_MODEL_MODE",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_DEPLOYMENT_LARGE",
  "AZURE_OPENAI_API_VERSION",
  "OPENAI_API_KEY",
];

describe("azure openai model adapter", () => {
  const saved = {};
  before(() => {
    for (const k of KEYS) saved[k] = process.env[k];
    for (const k of KEYS) delete process.env[k];
  });
  after(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("resolves to the Azure adapter when mode=azure and creds are present", () => {
    process.env.MIAI_MODEL_MODE = "azure";
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    process.env.AZURE_OPENAI_ENDPOINT = "https://res.openai.azure.com";
    assert.ok(createModelAdapter() instanceof AzureOpenAIModelAdapter);
  });

  it("does NOT resolve to Azure when the endpoint is missing (falls back)", () => {
    process.env.MIAI_MODEL_MODE = "azure";
    process.env.AZURE_OPENAI_API_KEY = "test-key";
    delete process.env.AZURE_OPENAI_ENDPOINT;
    assert.ok(!(createModelAdapter() instanceof AzureOpenAIModelAdapter));
  });

  it("builds a deployment-scoped endpoint with api-version, and routes tiers to deployments", () => {
    process.env.AZURE_OPENAI_ENDPOINT = "https://res.openai.azure.com/";
    process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-4o-mini";
    process.env.AZURE_OPENAI_DEPLOYMENT_LARGE = "gpt-4o";
    process.env.AZURE_OPENAI_API_VERSION = "2024-10-21";
    const a = new AzureOpenAIModelAdapter();
    // Private helpers are exercised via the public shape; assert through a light reflection.
    const mini = a["endpoint"](a["deployment"]({ model: "gpt-4o-mini" }));
    const large = a["endpoint"](a["deployment"]({ model: "claude-sonnet" }));
    assert.match(mini, /\/openai\/deployments\/gpt-4o-mini\/chat\/completions\?api-version=2024-10-21$/);
    assert.match(large, /\/openai\/deployments\/gpt-4o\/chat\/completions\?api-version=2024-10-21$/);
    assert.ok(!mini.includes("//openai"), "no double slash after trimming trailing slash");
  });
});
