/**
 * DSAR erasure module smoke test (file fallback — no Postgres required).
 * Run: pnpm --filter @miai/web test
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("dsar-erase", () => {
  /** @type {Record<string, string | undefined>} */
  let savedPaths = {};

  before(() => {
    const dir = mkdtempSync(join(tmpdir(), "miai-dsar-"));
    const keys = [
      "DATA_DIR",
      "RENTAL_STORE_PATH",
      "KNOWLEDGE_STORE_PATH",
      "OAUTH_TOKEN_STORE_PATH",
      "CUSTOM_REQUESTS_PATH",
      "TURN_TRANSCRIPTS_PATH",
      "WORKSPACE_MEMBERS_PATH",
    ];
    savedPaths = {};
    for (const k of keys) savedPaths[k] = process.env[k];
    process.env.DATA_DIR = dir;
    process.env.RENTAL_STORE_PATH = join(dir, "rentals.json");
    process.env.KNOWLEDGE_STORE_PATH = join(dir, "knowledge-sources.json");
    process.env.OAUTH_TOKEN_STORE_PATH = join(dir, "oauth-tokens.json");
    process.env.CUSTOM_REQUESTS_PATH = join(dir, "custom-requests.json");
    process.env.TURN_TRANSCRIPTS_PATH = join(dir, "turn-transcripts.json");
    process.env.WORKSPACE_MEMBERS_PATH = join(dir, "workspace-members.json");
  });

  after(() => {
    for (const [k, v] of Object.entries(savedPaths)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("exports eraseWorkspaceData", async () => {
    const mod = await import("../src/lib/dsar-erase.ts");
    assert.equal(typeof mod.eraseWorkspaceData, "function");
  });

  it("eraseWorkspaceData returns deleted counts shape", async () => {
    const { eraseWorkspaceData } = await import("../src/lib/dsar-erase.ts");
    const { deleted } = await eraseWorkspaceData("ws_smoke_test_nonexistent");
    assert.equal(typeof deleted, "object");
    assert.equal(typeof deleted.rentals, "number");
    assert.equal(typeof deleted.turnTranscripts, "number");
    assert.equal(typeof deleted.knowledgeSources, "number");
    assert.equal(typeof deleted.oauthTokens, "number");
    assert.equal(typeof deleted.workspaceMembers, "number");
    assert.equal(typeof deleted.customRequests, "number");
    assert.equal(typeof deleted.auditDetailsRedacted, "number");
  });
});
