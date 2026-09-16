import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentStudio } from "@/components/AgentStudio";
import type { RegionFact } from "@/components/RegionStrip";
import { familyIdFromAgentId, getAgentPackage } from "@/lib/catalog";
import { AGENT_JS_INTEGRITY } from "@/lib/agent-js-sri";

type Props = { params: Promise<{ id: string }> };

const MARKET_META: Array<{ id: string; label: string; flag: string }> = [
  { id: "us", label: "US", flag: "🇺🇸" },
  { id: "eu", label: "EU", flag: "🇪🇺" },
  { id: "africa", label: "Africa", flag: "🌍" },
  { id: "asia", label: "Asia", flag: "🌏" },
  { id: "oceania", label: "Oceania", flag: "🇦🇺" },
];

/** The family's 5 regional packs (compliance/languages/channels per market) for the studio strip. */
async function regionFacts(id: string): Promise<RegionFact[]> {
  const familyId = familyIdFromAgentId(id);
  const regions: RegionFact[] = [];
  for (const m of MARKET_META) {
    const packId = `${m.id}-${familyId}`;
    const pkg = await getAgentPackage(packId);
    if (!pkg) continue;
    regions.push({
      market: m.id,
      label: m.label,
      flag: m.flag,
      packId,
      compliance: pkg.manifest.compliance ?? [],
      languages: pkg.manifest.languages ?? [],
      channels: pkg.manifest.channels ?? [],
      current: packId === id,
    });
  }
  return regions;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getAgentPackage(id);
  if (!pkg) {
    return { title: "Agent not found — MyInstantAI" };
  }
  return {
    title: `${pkg.manifest.name} — MyInstantAI Agents`,
    description: pkg.manifest.summary?.slice(0, 160) || `Configure and rent ${pkg.manifest.name}.`,
  };
}

export default async function AgentPage({ params }: Props) {
  const { id } = await params;
  const pkg = await getAgentPackage(id);
  if (!pkg) notFound();
  const regions = await regionFacts(id);
  return <AgentStudio agentId={id} scriptIntegrity={AGENT_JS_INTEGRITY} regions={regions} />;
}
