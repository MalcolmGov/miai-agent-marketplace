import type { NextConfig } from "next";
import path from "path";

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
};

export default nextConfig;
