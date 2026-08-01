/** Build CORS headers for the public embed chat API. */

function allowedOrigins(): string[] | "*" {
  const raw = process.env.EMBED_ALLOWED_ORIGINS?.trim();
  if (!raw || raw === "*") return "*";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function originMatches(origin: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern === origin) return true;
  // Support https://*.example.com
  if (pattern.includes("*")) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, "[^.]+");
    return new RegExp(`^${escaped}$`, "i").test(origin);
  }
  return false;
}

export function embedCorsHeaders(req?: Request): Record<string, string> {
  const allow = allowedOrigins();
  const requestOrigin = req?.headers.get("origin") ?? "";

  let allowOrigin = "*";
  if (allow !== "*") {
    if (requestOrigin && allow.some((p) => originMatches(requestOrigin, p))) {
      allowOrigin = requestOrigin;
    } else if (!requestOrigin) {
      // Non-browser clients (curl/smoke) — no ACAO needed for same-origin tooling
      allowOrigin = allow[0] ?? "null";
    } else {
      allowOrigin = "null";
    }
  }

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
