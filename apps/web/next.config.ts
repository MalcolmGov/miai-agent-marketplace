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
  // CSP is set per-request in middleware.ts (nonce + strict-dynamic for script-src).
  // HSTS — only meaningful on HTTPS custom domains / Railway TLS
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
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
  async rewrites() {
    return [
      {
        source: "/catalogue/:id*",
        destination: "/agents/:id*",
      },
    ];
  },
};

export default nextConfig;
