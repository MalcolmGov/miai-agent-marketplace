import { Suspense } from "react";
import { CatalogGrid } from "@/components/CatalogGrid";
import { listFamilies } from "@/lib/catalog";

export const metadata = {
  title: "MyInstantAI Agents — Global agent marketplace",
  description:
    "Browse 100 AI agent families across US, EU, Africa, Asia, and Oceania. Rent, configure, connect Actions, and embed.",
};

function HomeFallback() {
  return (
    <div className="panel px-6 py-12 text-center text-sm text-[var(--muted)]">Loading catalogue…</div>
  );
}

export default async function HomePage() {
  const families = await listFamilies();
  // Shape matches CatalogGrid FamilyItem / /api/catalog families view
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
  }));

  return (
    <Suspense fallback={<HomeFallback />}>
      <CatalogGrid initialFamilies={initialFamilies} />
    </Suspense>
  );
}
