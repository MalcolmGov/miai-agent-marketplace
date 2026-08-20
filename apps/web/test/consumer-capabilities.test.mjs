/**
 * Onboarding capability data invariants — the source of truth behind the /me first-run welcome,
 * the "What I can do" sheet, and the starter prompts. Pure data; no DOM, no network.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

let cap;
before(async () => {
  cap = await import("../src/app/me/capabilities.ts");
});

describe("capability groups", () => {
  it("every group has a title, blurb and at least one tap-to-run example", () => {
    assert.ok(cap.CAPABILITY_GROUPS.length >= 5);
    for (const g of cap.CAPABILITY_GROUPS) {
      assert.ok(g.title && g.blurb, `${g.key} has title + blurb`);
      assert.ok(Array.isArray(g.examples) && g.examples.length >= 1, `${g.key} has examples`);
      assert.ok(g.icon, `${g.key} has an icon`);
    }
  });

  it("every needed connector is a known connector label", () => {
    const known = new Set(Object.keys(cap.CONNECTOR_LABEL));
    for (const g of cap.CAPABILITY_GROUPS) {
      for (const need of g.needs) {
        assert.ok(known.has(need), `${g.key} needs unknown connector "${need}"`);
      }
    }
  });

  it("leads with no-setup groups so a cold user gets value before any connect step", () => {
    const first = cap.CAPABILITY_GROUPS[0];
    const second = cap.CAPABILITY_GROUPS[1];
    assert.equal(first.needs.length, 0, "first group needs no account");
    assert.equal(second.needs.length, 0, "second group needs no account");
  });
});

describe("starter + first-run prompts", () => {
  it("first-run prompts all work with nothing connected", () => {
    // Each first-run prompt must belong to a group that needs no connected account.
    const noSetup = cap.CAPABILITY_GROUPS.filter((g) => g.needs.length === 0);
    const noSetupExamples = new Set(noSetup.flatMap((g) => g.examples));
    assert.ok(cap.FIRST_RUN_PROMPTS.length >= 3);
    for (const p of cap.FIRST_RUN_PROMPTS) {
      assert.ok(noSetupExamples.has(p), `"${p}" is a no-setup example`);
    }
  });

  it("starter prompts lead with the no-setup ones", () => {
    assert.ok(cap.STARTER_PROMPTS.length >= 4);
    const noSetupExamples = new Set(
      cap.CAPABILITY_GROUPS.filter((g) => g.needs.length === 0).flatMap((g) => g.examples),
    );
    assert.ok(noSetupExamples.has(cap.STARTER_PROMPTS[0]), "first starter prompt needs no setup");
  });
});

describe("unmetConnectorLabels", () => {
  it("returns labels only for the connectors not yet connected", () => {
    const labels = cap.unmetConnectorLabels(["email", "google_calendar"], new Set(["email"]));
    assert.deepEqual(labels, ["Calendar"]);
  });

  it("is empty when everything a group needs is connected", () => {
    assert.deepEqual(cap.unmetConnectorLabels(["spotify"], new Set(["spotify"])), []);
    assert.deepEqual(cap.unmetConnectorLabels([], new Set()), []);
  });
});
