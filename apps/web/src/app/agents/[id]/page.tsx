import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentStudio } from "@/components/AgentStudio";
import { getAgentPackage } from "@/lib/catalog";
import { AGENT_JS_INTEGRITY } from "@/lib/agent-js-sri";

type Props = { params: Promise<{ id: string }> };

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
  return <AgentStudio agentId={id} scriptIntegrity={AGENT_JS_INTEGRITY} />;
}
