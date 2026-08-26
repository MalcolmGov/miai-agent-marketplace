import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { userFacingNote } from "../dist/workflows/tool-notes.js";

// Tool results (esp. sandbox stubs) carry a `note` that is sometimes user content but often an
// internal directive ("Sandbox stub — prefer price from knowledge base"). Workflows append the note
// to replies, so directive notes must be filtered out — the us-pharmacy stub-note leak found in the
// live eval sweep.

describe("userFacingNote — strips internal stub/steering notes", () => {
  const internal = [
    "Sandbox stub — prefer price from knowledge base.",
    "Sandbox stub — prefer prices from knowledge base menu sections.",
    "Sandbox stub status.",
    "Answer from the knowledge base policy sections for this topic.",
    "Prefer treatment details and prices from the knowledge base.",
    "Answer amenity/check-in/breakfast/parking from knowledge.",
    "Relay requirements from knowledge / openings.",
    "No live ATS connected — answer from knowledge base open roles when available.",
  ];
  for (const n of internal) {
    it(`drops: ${n.slice(0, 42)}…`, () => {
      assert.equal(userFacingNote(n), undefined);
    });
  }

  const userFacing = [
    "IT will update you when it moves.",
    "Ready for collection at counter 3.",
    "Limited stock — a few left.",
    "Casual",
  ];
  for (const n of userFacing) {
    it(`keeps: ${n}`, () => {
      assert.equal(userFacingNote(n), n);
    });
  }

  it("handles non-strings and empties", () => {
    assert.equal(userFacingNote(undefined), undefined);
    assert.equal(userFacingNote(null), undefined);
    assert.equal(userFacingNote(42), undefined);
    assert.equal(userFacingNote("   "), undefined);
    assert.equal(userFacingNote("  keep me  "), "keep me");
  });
});
