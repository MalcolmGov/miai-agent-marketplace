/**
 * Rich-text parsing for assistant chat bubbles — the layer that made model markdown (links, cover
 * images, bold) render as real nodes instead of literal text. Pure; no DOM. The renderer in
 * rich-text.tsx maps these segments to safe React nodes, but the parsing (and the safety-relevant
 * choices — https-only images, YouTube id extraction) all live here where they're testable.
 */
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

let rt;
before(async () => {
  rt = await import("../src/lib/rich-text-parse.ts");
});

const types = (s) => rt.parseRichText(s).map((x) => x.type);

describe("parseRichText — turns light markdown into typed segments", () => {
  it("markdown link → link segment with label + href", () => {
    const segs = rt.parseRichText("see [Watch here](https://youtu.be/abcdefghijk) now");
    assert.deepEqual(types("see [Watch here](https://youtu.be/abcdefghijk) now"), [
      "text", "link", "text",
    ]);
    const link = segs.find((s) => s.type === "link");
    assert.equal(link.text, "Watch here");
    assert.equal(link.href, "https://youtu.be/abcdefghijk");
  });

  it("bare URL → link, trailing punctuation stays out of the href", () => {
    const segs = rt.parseRichText("go to https://example.com/x, ok?");
    const link = segs.find((s) => s.type === "link");
    assert.equal(link.href, "https://example.com/x");
    assert.ok(segs.some((s) => s.type === "text" && s.text.startsWith(",")));
  });

  it("**bold** → bold segment", () => {
    const segs = rt.parseRichText("that is **important** stuff");
    assert.deepEqual(segs.find((s) => s.type === "bold"), { type: "bold", text: "important" });
  });

  it("markdown image (https) → image segment, not a link", () => {
    const segs = rt.parseRichText("cover ![thumb](https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg)");
    const img = segs.find((s) => s.type === "image");
    assert.ok(img, "image segment produced");
    assert.equal(img.src, "https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg");
    assert.equal(img.alt, "thumb");
    assert.ok(!segs.some((s) => s.type === "link"), "image is not parsed as a link");
  });

  it("does not emit https-less (unsafe) images", () => {
    // http image markdown falls through to plain text — no image segment, no injection surface.
    assert.ok(!types("![x](http://insecure/y.png)").includes("image"));
  });

  it("plain text passes through as a single text segment", () => {
    assert.deepEqual(rt.parseRichText("just words"), [{ type: "text", text: "just words" }]);
  });

  it("empty / nullish input is safe", () => {
    assert.deepEqual(rt.parseRichText(""), [{ type: "text", text: "" }]);
    assert.deepEqual(rt.parseRichText(undefined), [{ type: "text", text: "" }]);
  });
});

describe("youtubeVideoId — pulls the id from any common YouTube URL shape", () => {
  const id = "dQw4w9WgXcQ";
  it("watch?v=", () => assert.equal(rt.youtubeVideoId(`https://www.youtube.com/watch?v=${id}`), id));
  it("watch with extra params", () =>
    assert.equal(rt.youtubeVideoId(`https://www.youtube.com/watch?feature=x&v=${id}`), id));
  it("youtu.be short link", () => assert.equal(rt.youtubeVideoId(`https://youtu.be/${id}`), id));
  it("shorts", () => assert.equal(rt.youtubeVideoId(`https://www.youtube.com/shorts/${id}`), id));
  it("non-YouTube URL → null", () =>
    assert.equal(rt.youtubeVideoId("https://example.com/watch?v=nope"), null));
});
