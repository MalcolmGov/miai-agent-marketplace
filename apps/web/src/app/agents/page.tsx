import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogGrid } from "@/components/CatalogGrid";
import { listFamilies } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "AI Agent Marketplace — MyInstantAI",
  description:
    "Browse 510 AI agents across US, EU, Africa, Asia, and Oceania (102 families × 5 regions). Rent, configure, connect Actions, and embed.",
};

function MarketplaceFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading AI Agent Marketplace">
      <div className="panel space-y-3 p-8">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-96" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel space-y-3 p-5">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
            <div className="skeleton h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AIAgentMarketplacePage() {
  const families = await listFamilies();
  const initialFamilies = families.map((f) => ({
    id: f.id,
    name: f.name,
    tier: f.tier,
    summary: f.summary,
    channels: f.channels,
    marketplaceCategory: f.marketplaceCategory,
    audience: f.audience,
    markets: f.markets,
    packs: f.packs,
    hasZa: f.hasZa,
    pilot: f.pilot,
    liveReady: f.liveReady,
    catalogueReady: f.catalogueReady,
    defaultAgentId: f.defaultAgentId,
    requiresConnectors: f.requiresConnectors,
  }));

  return (
    <Suspense fallback={<MarketplaceFallback />}>
      <CatalogGrid initialFamilies={initialFamilies} />
    </Suspense>
  );
}
