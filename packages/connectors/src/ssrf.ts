/**
 * Outbound URL safety — block SSRF to loopback, link-local, and private ranges.
 * Used by webhook POSTs and (via re-export) knowledge crawls.
 */
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { Readable } from "node:stream";
import zlib from "node:zlib";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "metadata.azure.com",
]);

function normalizeIp(ip: string): string {
  // Node sometimes returns IPv4-mapped IPv6 (::ffff:a.b.c.d)
  if (ip.toLowerCase().startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

/** True if the address must never be fetched by server-side egress. */
export function isBlockedIp(ip: string): boolean {
  const addr = normalizeIp(ip.trim());
  if (!net.isIP(addr)) return true;

  if (net.isIPv4(addr)) {
    const parts = addr.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  const lower = addr.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("ff")) return true; // multicast
  // IPv6 transition prefixes that embed an IPv4 address (which may be private/metadata, e.g.
  // 169.254.169.254) and would otherwise slip past the v4 rules above — deny outright; server-side
  // egress never legitimately needs NAT64 or 6to4. P2-3.
  if (lower.startsWith("64:ff9b:")) return true; // NAT64 64:ff9b::/96 (and 64:ff9b:1::/48)
  if (lower.startsWith("2002:")) return true; // 6to4 2002::/16
  return false;
}

function hostnameBlocked(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (host === "0.0.0.0") return true;
  // Literal IP in hostname
  if (net.isIP(host) && isBlockedIp(host)) return true;
  return false;
}

export type SafeUrlResult =
  | { ok: true; url: URL; addresses: string[] }
  | { ok: false; reason: string };

/**
 * Validate scheme/hostname and resolve DNS — reject if any address is private.
 */
export async function assertSafeOutboundUrl(raw: string): Promise<SafeUrlResult> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http/https URLs are allowed" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs with credentials are not allowed" };
  }
  if (hostnameBlocked(url.hostname)) {
    return { ok: false, reason: "Blocked hostname (loopback/private/metadata)" };
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      return { ok: false, reason: "Blocked IP address" };
    }
    return { ok: true, url, addresses: [host] };
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    return { ok: false, reason: "DNS lookup failed" };
  }

  if (!addresses.length) {
    return { ok: false, reason: "DNS returned no addresses" };
  }
  for (const addr of addresses) {
    if (isBlockedIp(addr)) {
      return { ok: false, reason: `Resolves to blocked address (${addr})` };
    }
  }
  return { ok: true, url, addresses };
}

export async function assertSafeOutboundUrlOrThrow(raw: string): Promise<URL> {
  const result = await assertSafeOutboundUrl(raw);
  if (!result.ok) throw new Error(`SSRF blocked: ${result.reason}`);
  return result.url;
}

/** Combine an optional caller signal with a fresh timeout so a hung endpoint can't block forever. */
export function withTimeoutSignal(existing: AbortSignal | null | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return existing ? AbortSignal.any([existing, timeout]) : timeout;
}

/** Body shapes callers actually use (JSON strings, form-encoded, raw bytes). */
type PinnedBody = string | Uint8Array;

function toNodeHeaders(init: RequestInit | undefined, hasStringBody: boolean): Record<string, string> {
  const out: Record<string, string> = {};
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      out[key] = value;
    });
  }
  // Same default undici's fetch applies to string bodies, so server-side payloads keep working
  // when a caller forgets the header.
  if (hasStringBody && !("content-type" in out)) {
    out["content-type"] = "text/plain;charset=UTF-8";
  }
  return out;
}

function bodyToBuffer(body: RequestInit["body"]): PinnedBody | undefined {
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof Uint8Array) return body; // Buffer is a Uint8Array
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body instanceof URLSearchParams) return body.toString();
  throw new Error("safeFetch: unsupported request body type");
}

/** Transparently undo the encodings a real server is most likely to send. */
function decodeBody(res: http.IncomingMessage): http.IncomingMessage | Readable {
  const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
  if (encoding === "gzip" || encoding === "x-gzip") return res.pipe(zlib.createGunzip());
  if (encoding === "deflate") return res.pipe(zlib.createInflate());
  if (encoding === "br") return res.pipe(zlib.createBrotliDecompress());
  return res;
}

const BODYLESS_STATUS = new Set([101, 204, 205, 304]);

/**
 * Issue the request against a pre-validated IP. Exported for unit tests.
 *
 * Callers MUST run `assertSafeOutboundUrl` first: this function performs no SSRF checks of its own.
 * The socket's DNS lookup is pinned to `ip` (anti-rebinding) while TLS SNI, certificate
 * verification and the Host header all stay on the real hostname — so pinning never weakens TLS.
 * Redirects are never followed (callers handle Location themselves), matching fetch's
 * `redirect: "manual"`.
 */
export function pinnedRequest(
  url: URL,
  ip: string,
  family: 4 | 6,
  init?: RequestInit & { signal?: AbortSignal | null },
): Promise<Response> {
  const timeoutMs = Number(process.env.MIAI_CONNECTOR_TIMEOUT_MS) || 10000;
  // Bound the connector call so a hung endpoint (customer webhook / MCP / vendor API) cannot pin the
  // request slot forever. Env-overridable.
  const signal = withTimeoutSignal(init?.signal, timeoutMs);
  const isHttps = url.protocol === "https:";
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const body = bodyToBuffer(init?.body);
  const headers = toNodeHeaders(init, typeof body === "string");

  return new Promise<Response>((resolve, reject) => {
    const req = (isHttps ? https : http).request(
      url,
      {
        method: init?.method ?? "GET",
        headers,
        // Pin the connection: every hostname lookup resolves to the address we already vetted.
        // Node may call lookup with `all: true` (happy-eyeballs); answer both shapes.
        lookup: (_hostname, options, cb) => {
          const opts = options as { all?: boolean } | undefined;
          if (opts?.all) {
            (cb as unknown as (err: null, a: { address: string; family: number }[]) => void)(null, [
              { address: ip, family },
            ]);
            return;
          }
          (cb as unknown as (err: null, address: string, family: number) => void)(null, ip, family);
        },
        servername: isHttps && !net.isIP(hostname) ? hostname : undefined,
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 502;
        if (status < 200) {
          res.resume();
          reject(new Error(`Unexpected interim response (HTTP ${status})`));
          return;
        }
        const encoded = decodeBody(res);
        const outHeaders = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value === undefined) continue;
          if (key === "content-encoding" || key === "content-length") continue; // body is re-streamed
          if (Array.isArray(value)) for (const v of value) outHeaders.append(key, v);
          else outHeaders.set(key, String(value));
        }
        const bodyless = BODYLESS_STATUS.has(status) || (init?.method ?? "GET").toUpperCase() === "HEAD";
        if (bodyless) encoded.resume?.();
        resolve(
          new Response(
            bodyless ? null : (Readable.toWeb(encoded) as unknown as ReadableStream<Uint8Array>),
            { status, statusText: res.statusMessage, headers: outHeaders },
          ),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Fetch after SSRF checks, pinning DNS to a validated address (mitigates rebinding).
 * Uses node's own http/https client so the pinned path works in the standalone production image
 * (the previous undici dynamic import was unavailable there, failing every outbound connector call).
 */
export async function safeFetch(raw: string, init?: RequestInit): Promise<Response> {
  const result = await assertSafeOutboundUrl(raw);
  if (!result.ok) throw new Error(`SSRF blocked: ${result.reason}`);
  const { url, addresses } = result;
  const ip = addresses[0];
  const family: 4 | 6 = net.isIPv6(ip) ? 6 : 4;
  return pinnedRequest(url, ip, family, init);
}
