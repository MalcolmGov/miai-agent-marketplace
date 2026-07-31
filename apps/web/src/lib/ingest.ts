/** Lightweight HTML → plain text for website crawls (no heavy deps). */

export function htmlToText(html: string): string {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  s = s
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article|header|footer)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");

  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return s;
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  return htmlToText(m[1]).slice(0, 120) || null;
}

export function sameOriginLinks(html: string, pageUrl: string, limit = 8): string[] {
  let origin: string;
  let host: string;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    host = u.host;
  } catch {
    return [];
  }

  const found = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && found.size < limit * 3) {
    try {
      const abs = new URL(m[1], pageUrl);
      if (abs.host !== host) continue;
      if (!/^https?:$/i.test(abs.protocol)) continue;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|mp4|webp)(\?|$)/i.test(abs.pathname)) continue;
      abs.hash = "";
      found.add(abs.toString());
    } catch {
      /* skip */
    }
  }

  // Prefer homepage-adjacent paths
  return [...found]
    .filter((u) => u !== pageUrl)
    .slice(0, limit)
    .map((u) => {
      try {
        return new URL(u, origin).toString();
      } catch {
        return u;
      }
    });
}

export async function fetchPage(
  url: string,
  timeoutMs = 12_000,
): Promise<{ url: string; title: string; text: string; html: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "MyInstantAI-KnowledgeBot/1.0 (+https://myinstantai.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ctype = res.headers.get("content-type") ?? "";
    const body = await res.text();
    if (/text\/plain/i.test(ctype)) {
      return { url: res.url || url, title: url, text: body.slice(0, 100_000), html: "" };
    }
    const title = extractTitle(body) ?? url;
    const text = htmlToText(body).slice(0, 100_000);
    return { url: res.url || url, title, text, html: body };
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlSite(
  startUrl: string,
  opts?: { maxPages?: number },
): Promise<{ pages: Array<{ url: string; title: string; text: string }>; errors: string[] }> {
  const maxPages = opts?.maxPages ?? 5;
  const normalized = startUrl.match(/^https?:\/\//i) ? startUrl : `https://${startUrl}`;
  const pages: Array<{ url: string; title: string; text: string }> = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  let queue: string[] = [normalized];
  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    try {
      const page = await fetchPage(next);
      if (page.text.length < 40) {
        errors.push(`${next}: little text extracted`);
      } else {
        pages.push({ url: page.url, title: page.title, text: page.text });
      }
      if (pages.length < maxPages && page.html) {
        const links = sameOriginLinks(page.html, page.url, 8);
        for (const link of links) {
          if (!seen.has(link)) queue.push(link);
        }
        // Prefer shorter paths (about, faq, contact, pricing, services)
        queue = queue.sort((a, b) => {
          const score = (u: string) => {
            const p = new URL(u).pathname.toLowerCase();
            if (/about|faq|contact|pricing|service|product|deliver|policy|hour/.test(p)) return 0;
            return p.length;
          };
          return score(a) - score(b);
        });
      }
    } catch (e) {
      errors.push(`${next}: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }

  return { pages, errors };
}

export function fileToText(filename: string, mime: string | undefined, buf: Buffer): string {
  const lower = filename.toLowerCase();
  const asUtf8 = () => buf.toString("utf8");

  if (
    /text\/|json|csv|markdown|xml/i.test(mime ?? "") ||
    /\.(txt|md|markdown|csv|json|html?|xml|log)$/i.test(lower)
  ) {
    const raw = asUtf8();
    if (/\.html?$/i.test(lower) || /text\/html/i.test(mime ?? "")) return htmlToText(raw);
    return raw;
  }

  // Naive PDF text scrape (no full PDF parser) — extracts readable strings between streams
  if (/\.pdf$/i.test(lower) || mime === "application/pdf") {
    const raw = buf.toString("latin1");
    const chunks: string[] = [];
    const re = /\((?:\\.|[^\\)])+\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) {
      const inner = m[0]
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\t/g, " ")
        .replace(/\\(.)/g, "$1");
      if (/[A-Za-z]{3,}/.test(inner)) chunks.push(inner);
    }
    const text = chunks.join(" ").replace(/\s+/g, " ").trim();
    if (text.length > 80) return text.slice(0, 100_000);
    throw new Error(
      "Could not extract text from this PDF. Export as .txt/.md or paste the content.",
    );
  }

  throw new Error(
    `Unsupported file type (${filename}). Upload .txt, .md, .csv, .json, .html, or a text-based PDF.`,
  );
}
