import { embedOriginStarAllowed } from "@/lib/security";

/** Build CORS headers for the public embed chat API. */

function appOrigin(): string | null {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * In production, bare `*` is denied unless dual flags:
 * ALLOW_EMBED_ORIGIN_STAR=1 and I_UNDERSTAND_EMBED_ORIGIN_STAR=1 (staging only).
 * Missing config falls back to APP_BASE_URL origin, else deny browser cross-origin.
 */
function allowedOrigins(): string[] | "*" {
  const raw = process.env.EMBED_ALLOWED_ORIGINS?.trim();
  const prod = process.env.NODE_ENV === "production";
  const starOk = embedOriginStarAllowed();

  if (!raw) {
    if (prod && !starOk) {
      const app = appOrigin();
      return app ? [app] : [];
    }
    return "*";
  }

  if (raw === "*") {
    if (prod && !starOk) {
      const app = appOrigin();
      return app ? [app] : [];
    }
    return "*";
  }

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
  if (allow === "*") {
    allowOrigin = "*";
  } else if (allow.length === 0) {
    allowOrigin = "null";
  } else if (requestOrigin && allow.some((p) => originMatches(requestOrigin, p))) {
    allowOrigin = requestOrigin;
  } else if (!requestOrigin) {
    // Non-browser clients (curl/smoke) — no ACAO needed for same-origin tooling
    allowOrigin = allow[0] ?? "null";
  } else {
    allowOrigin = "null";
  }

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
