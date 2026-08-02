import type { MetadataRoute } from "next";
import { listCatalog, listFamilies } from "@/lib/catalog";

const BASE = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://miaiweb-production.up.railway.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [families, agents] = await Promise.all([listFamilies(), listCatalog()]);
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/trust",
    "/legal",
    "/privacy",
    "/terms",
    "/cookies",
    "/data-protection",
    "/ask",
    "/demo",
    "/install",
  ].map((p) => ({
    url: `${BASE}${p || "/"}`,
    lastModified: now,
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  const familyRoutes: MetadataRoute.Sitemap = families.slice(0, 100).map((f) => ({
    url: `${BASE}/agents/${f.defaultAgentId || f.markets.us || f.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Cap agent URLs — full 500 is fine for sitemap size
  const agentRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${BASE}/agents/${a.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...familyRoutes, ...agentRoutes];
}
