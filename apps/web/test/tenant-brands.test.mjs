/**
 * White-label brand registry: the data behind the /me brand switcher. Pure; no DOM, no network.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

let tb;
before(async () => {
  tb = await import("../src/lib/tenant-brands.ts");
});

describe("brands", () => {
  it("includes the default plus the three carriers, each fully specified", () => {
    const ids = tb.BRANDS.map((b) => b.id);
    for (const id of ["myinstantai", "vodacom", "mtn", "airtel"]) {
      assert.ok(ids.includes(id), `has ${id}`);
    }
    for (const b of tb.BRANDS) {
      assert.ok(b.name && b.tagline, `${b.id} has name + tagline`);
      for (const c of [b.accent, b.accentBright, b.accentDim, b.accentInk]) {
        assert.match(c, /^#[0-9a-fA-F]{6}$/, `${b.id} colour ${c} is a hex`);
      }
    }
  });

  it("the default brand id resolves", () => {
    assert.equal(tb.getBrand(tb.DEFAULT_BRAND_ID).id, tb.DEFAULT_BRAND_ID);
  });

  it("getBrand falls back to the default for unknown/empty ids", () => {
    assert.equal(tb.getBrand("nope").id, tb.DEFAULT_BRAND_ID);
    assert.equal(tb.getBrand("").id, tb.DEFAULT_BRAND_ID);
    assert.equal(tb.getBrand(null).id, tb.DEFAULT_BRAND_ID);
    assert.equal(tb.getBrand(undefined).id, tb.DEFAULT_BRAND_ID);
  });

  it("getBrand resolves a carrier by id", () => {
    const mtn = tb.getBrand("mtn");
    assert.equal(mtn.name, "MTN");
    assert.equal(mtn.accentInk, "#1a1a1a", "MTN uses dark ink on its yellow accent for contrast");
  });

  it("brandThemeVars maps the four accent tokens", () => {
    const vars = tb.brandThemeVars(tb.getBrand("vodacom"));
    assert.equal(vars["--accent"], "#e60000");
    assert.equal(vars["--accent-ink"], "#ffffff");
    assert.deepEqual(
      Object.keys(vars).sort(),
      ["--accent", "--accent-bright", "--accent-dim", "--accent-ink"],
    );
  });
});
