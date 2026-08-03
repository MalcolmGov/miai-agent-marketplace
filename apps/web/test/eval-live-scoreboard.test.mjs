import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const boardPath = path.join(root, "data/reports/eval-live-scoreboard.json");

describe("eval-live scoreboard", () => {
  it("publishes hero sets with honest coverage fields", () => {
    const board = JSON.parse(readFileSync(boardPath, "utf8"));
    assert.equal(board.version, 1);
    assert.match(board.disclaimer, /MockModel/i);
    assert.match(board.coverageNote, /Depth: live/i);

    const ids = board.sets.map((s) => s.id);
    assert.ok(ids.includes("go-live-18"), "go-live-18 set present");
    assert.ok(ids.includes("flagship-2"), "flagship-2 set present");

    const goLive = board.sets.find((s) => s.id === "go-live-18");
    assert.equal(goLive.passed, 17);
    assert.equal(goLive.total, 18);

    assert.ok(board.connectorProofs.sliceTarget >= 4);
    assert.ok(Array.isArray(board.connectorProofs.proofs));
  });
});
