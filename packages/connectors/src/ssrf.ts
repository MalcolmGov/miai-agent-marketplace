/**
 * Outbound URL safety — block SSRF to loopback, link-local, and private ranges.
 * Used by webhook POSTs and (via re-export) knowledge crawls.
 */
import dns from "node:dns/promises";
import net from "node:net";

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
