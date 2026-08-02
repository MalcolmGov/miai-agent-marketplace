/**
 * Thin API contract tests — no Next server required.
 * Run: pnpm --filter @miai/web test:api-contract
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgentPackage } from "@miai/agent-protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));
// apps/web/test → apps/web → apps → repo root
const repoRoot = join(__dirname, "../../..");
const catalogDir = join(repoRoot, "data/catalog");

describe("catalog index", () => {
  it("exists, parses, and lists >= 500 agents", () => {
    const raw = readFileSync(join(catalogDir, "index.json"), "utf8");
    const index = JSON.parse(raw);
    assert.ok(Array.isArray(index), "index.json must be an array");
    assert.ok(index.length >= 500, `expected >= 500 agents, got ${index.length}`);
    const first = index[0];
    assert.equal(typeof first.id, "string");
    assert.equal(typeof first.name, "string");
    assert.ok(first.tools >= 1);
    assert.ok(first.evals >= 1);
  });
});

describe("catalog agent package", () => {
  it("loadAgentPackage validates us-hr-helpdesk pack", () => {
    const raw = JSON.parse(
      readFileSync(join(catalogDir, "us-hr-helpdesk.agent.json"), "utf8"),
    );
    const pkg = loadAgentPackage(raw);
    assert.equal(pkg.manifest.id, "us-hr-helpdesk");
    assert.ok(Array.isArray(pkg.tools) && pkg.tools.length >= 1);
    assert.ok(Array.isArray(pkg.evals) && pkg.evals.length >= 8);
  });
});

describe("auth (oidc)", () => {
  /** @type {typeof import("../src/lib/auth.ts")} */
  let authModule;
  const saved = {};

  before(async () => {
    for (const key of [
      "MIAI_AUTH_MODE",
      "MIAI_OIDC_ISSUER",
      "MIAI_OIDC_AUDIENCE",
      "MIAI_OIDC_JWKS_URL",
    ]) {
      saved[key] = process.env[key];
    }
    process.env.MIAI_AUTH_MODE = "oidc";
    process.env.MIAI_OIDC_ISSUER = "https://example.com";
    delete process.env.MIAI_OIDC_AUDIENCE;
    delete process.env.MIAI_OIDC_JWKS_URL;
    authModule = await import("../src/lib/auth.ts");
  });

  after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("resolveAuth rejects missing Bearer with AuthError 401", async () => {
    const req = new Request("https://marketplace.test/api/rent");
    await assert.rejects(
      () => authModule.resolveAuth(req),
      (err) => {
        assert.ok(err instanceof authModule.AuthError);
        assert.equal(err.status, 401);
        assert.match(err.message, /Missing Bearer token/i);
        return true;
      },
    );
  });
});

describe("public API paths", () => {
  it("isPublicApiPath allowlists health and consent, blocks rent", async () => {
    const { isPublicApiPath } = await import("../src/lib/auth.ts");
    assert.equal(isPublicApiPath("/api/health"), true);
    assert.equal(isPublicApiPath("/api/consent"), true);
    assert.equal(isPublicApiPath("/api/catalog"), true);
    assert.equal(isPublicApiPath("/api/catalog/family/ai-coding-assistant"), true);
    assert.equal(isPublicApiPath("/api/v1/openapi"), true);
    assert.equal(isPublicApiPath("/api/rent"), false);
  });
});

describe("mutating POST schemas (residual punch-list)", () => {
  it("rejects malformed bodies for remaining auth-gated handlers", async () => {
    const {
      parseJsonBody,
      configureBodySchema,
      customRequestBodySchema,
      dsarEraseBodySchema,
      knowledgeCrawlBodySchema,
      oauthDisconnectBodySchema,
      slackChannelsBodySchema,
      workspaceMemberInviteBodySchema,
    } = await import("../src/lib/api-schemas.ts");

    const cases = [
      [configureBodySchema, {}],
      [customRequestBodySchema, { business: "x", need: "short" }],
      [dsarEraseBodySchema, { confirm: false }],
      [knowledgeCrawlBodySchema, { agentId: "a", url: "" }],
      [oauthDisconnectBodySchema, {}],
      [slackChannelsBodySchema, {}],
      [workspaceMemberInviteBodySchema, { email: "not-an-email" }],
    ];

    for (const [schema, body] of cases) {
      const parsed = await parseJsonBody(
        new Request("http://marketplace.test/api", {
          method: "POST",
          body: JSON.stringify(body),
        }),
        schema,
      );
      assert.equal(parsed.ok, false, `expected reject for ${JSON.stringify(body)}`);
      if (!parsed.ok) assert.equal(parsed.response.status, 400);
    }
  });
});
