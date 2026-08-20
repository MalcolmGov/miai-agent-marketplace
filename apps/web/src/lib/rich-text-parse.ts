/**
 * Pure parsing for assistant chat messages — no React, so it runs under the type-stripping test
 * runner and stays trivially unit-testable. The React rendering lives in `rich-text.tsx`, which
 * imports from here.
 *
 * The model replies in light markdown — `[label](url)` links, `![alt](url)` images, `**bold**`, and
 * bare URLs. We turn those into typed segments; the renderer maps them to safe nodes (only http/https
 * links and https images are ever emitted, so there's no injection surface).
 */

export type RichSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "link"; text: string; href: string };

// One pass, alternatives tried left-to-right: markdown image (https only), markdown link, bare URL,
// then **bold**. The image branch must come before the link branch so `![alt](url)` isn't consumed
// as a `[alt](url)` link. Group map: 1=img alt, 2=img src, 3=link text, 4=link href, 5=bare url,
// 6=bold.
const RICH =
  /!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)|\*\*([^*]+?)\*\*/g;

// Video id from any common YouTube URL shape (watch / youtu.be / shorts / embed / live).
const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;

/** Extract a YouTube video id from a URL, or null if it isn't a YouTube video link. */
export function youtubeVideoId(href: string): string | null {
  const m = href.match(YOUTUBE_ID);
  return m ? m[1] : null;
}

/** Parse a message into typed segments. Pure + unit-testable (no React). */
export function parseRichText(input: string): RichSegment[] {
  const text = input ?? "";
  const out: RichSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(RICH)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", text: text.slice(last, idx) });
    if (m[2]) {
      out.push({ type: "image", alt: m[1] ?? "", src: m[2] });
    } else if (m[4]) {
      out.push({ type: "link", text: m[3], href: m[4] });
    } else if (m[5]) {
      // Bare URL — keep trailing punctuation ("(url).") out of the href.
      const href = m[5].replace(/[),.;!?]+$/, "");
      out.push({ type: "link", text: href, href });
      const trailing = m[5].slice(href.length);
      if (trailing) out.push({ type: "text", text: trailing });
    } else if (m[6]) {
      out.push({ type: "bold", text: m[6] });
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.length ? out : [{ type: "text", text }];
}
