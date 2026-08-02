import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    // microphone=(self) — catalogue voice search (Web Speech API)
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
  {
    // Enforcing CSP — Next.js still needs style unsafe-inline; script unsafe-eval dropped (Phase 0).
    // Remaining script unsafe-inline is for the App Router shell; nonce/hash migration is Phase 5.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // HSTS — only meaningful on HTTPS custom domains / Railway TLS
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@miai/agent-protocol",
    "@miai/wallet-adapter",
    "@miai/connectors",
    "@miai/presets",
    "@miai/runtime",
  ],
  serverExternalPackages: ["pg", "jose"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    externalDir: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
