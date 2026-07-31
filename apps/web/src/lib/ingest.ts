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

export function formatFetchError(e: unknown): string {
  if (!(e instanceof Error)) return "fetch failed";
  const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
  const code = cause?.code ?? "";
  if (code === "ENOTFOUND") {
    return "DNS lookup failed (try www. or check the domain)";
  }
  if (code === "ECONNREFUSED") return "connection refused";
  if (code === "CERT_HAS_EXPIRED" || /certificate/i.test(e.message)) {
    return "TLS/certificate error";
  }
  if (e.name === "AbortError") return "timed out";
  if (cause?.message) return `${e.message}: ${cause.message}`;
  return e.message || "fetch failed";
}

/** Build URL candidates: https, www, apex, http fallbacks. */
export function urlCandidates(startUrl: string): string[] {
  const raw = startUrl.trim();
  const withProto = raw.match(/^https?:\/\//i) ? raw : `https://${raw}`;
  const out: string[] = [];
  const push = (u: string) => {
    try {
      const parsed = new URL(u);
      const normalized = parsed.toString().replace(/\/$/, "") || parsed.toString();
      if (!out.includes(normalized)) out.push(normalized);
      const home = `${parsed.origin}/`;
      if (!out.includes(home)) out.push(home);
    } catch {
      /* skip */
    }
  };

  push(withProto);
  try {
    const u = new URL(withProto);
    if (u.hostname.startsWith("www.")) {
      push(`${u.protocol}//${u.hostname.slice(4)}${u.pathname}${u.search}`);
    } else {
      push(`${u.protocol}//www.${u.hostname}${u.pathname}${u.search}`);
    }
    if (u.protocol === "https:") {
      push(`http://${u.hostname}${u.pathname}${u.search}`);
      if (!u.hostname.startsWith("www.")) {
        push(`http://www.${u.hostname}${u.pathname}${u.search}`);
      }
    }
  } catch {
    /* skip */
  }
  return out;
}

export function sameOriginLinks(html: string, pageUrl: string, limit = 8): string[] {
  let origin: string;
  let host: string;
  try {
    const u = new URL(pageUrl);
    origin = u.origin;
    host = u.host.replace(/^www\./i, "");
  } catch {
    return [];
  }

  const found = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && found.size < limit * 3) {
    try {
      const abs = new URL(m[1], pageUrl);
      const absHost = abs.host.replace(/^www\./i, "");
      if (absHost !== host) continue;
      if (!/^https?:$/i.test(abs.protocol)) continue;
      if (/\.(pdf|jpg|jpeg|png|gif|svg|zip|css|js|mp4|webp)(\?|$)/i.test(abs.pathname)) continue;
      abs.hash = "";
      found.add(abs.toString());
    } catch {
      /* skip */
    }
  }

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
  timeoutMs = 15_000,
): Promise<{ url: string; title: string; text: string; html: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MyInstantAI-KnowledgeBot/1.0; +https://www.myinstantai.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "en-ZA,en;q=0.9",
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
  } catch (e) {
    throw new Error(formatFetchError(e));
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFirstWorking(
  candidates: string[],
): Promise<{ url: string; title: string; text: string; html: string }> {
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return await fetchPage(candidate);
    } catch (e) {
      errors.push(`${candidate}: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }
  throw new Error(errors[0] ?? "All URL variants failed");
}

export async function crawlSite(
  startUrl: string,
  opts?: { maxPages?: number },
): Promise<{ pages: Array<{ url: string; title: string; text: string }>; errors: string[] }> {
  const maxPages = opts?.maxPages ?? 5;
  const candidates = urlCandidates(startUrl);
  const pages: Array<{ url: string; title: string; text: string }> = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  let seed: { url: string; title: string; text: string; html: string };
  try {
    seed = await fetchFirstWorking(candidates);
  } catch (e) {
    return {
      pages: [],
      errors: [
        e instanceof Error
          ? e.message
          : "Could not reach that site — try https://www.yourdomain.com",
      ],
    };
  }

  let queue: string[] = [seed.url];
  const seedCache = new Map<string, typeof seed>([[seed.url, seed]]);

  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    try {
      const page = seedCache.get(next) ?? (await fetchPage(next));
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
