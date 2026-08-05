import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { probeSupportedConnectors } from "../dist/index.js";

describe("oauth probe registry", () => {
  it("covers Phase-1 OAuth connectors", () => {
    const ids = probeSupportedConnectors();
    for (const id of ["slack", "google_calendar", "hubspot", "email"]) {
      assert.ok(ids.includes(id), `missing probe for ${id}`);
    }
  });
});
