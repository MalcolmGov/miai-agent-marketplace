/**
 * DSAR erasure module smoke test (file fallback — no Postgres required).
 * Run: pnpm --filter @miai/web test
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("dsar-erase", () => {
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
