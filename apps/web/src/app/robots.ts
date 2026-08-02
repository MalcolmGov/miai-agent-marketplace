import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://miaiweb-production.up.railway.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/ops", "/workspace"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
