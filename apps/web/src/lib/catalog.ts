import { promises as fs } from "fs";
import path from "path";
import { loadAgentPackage, marketplaceCategory, type AgentPackage } from "@miai/agent-protocol";
import { getPreset, pilotAgentIds } from "@miai/presets";

export interface CatalogEntry {
  id: string;
  name: string;
  tier: string;
  category: string;
  market: string;
  summary: string;
  channels: string[];
  tools: number;
  evals: number;
  marketplaceCategory: string;
  pilot: boolean;
  liveReady: boolean;
}

function catalogDir(): string {
  return path.resolve(process.cwd(), process.env.CATALOG_DIR ?? "../../data/catalog");
}

export async function listCatalog(): Promise<CatalogEntry[]> {
  const raw = await fs.readFile(path.join(catalogDir(), "index.json"), "utf8");
  const index = JSON.parse(raw) as Array<{
    id: string;
    name: string;
    tier: string;
    category: string;
    market?: string;
    summary: string;
    channels: string[];
    tools: number;
    evals: number;
  }>;
  const pilots = new Set(pilotAgentIds());
  return index.map((e) => {
    const preset = getPreset(e.id);
    return {
      id: e.id,
      name: e.name,
      tier: e.tier,
      category: e.category,
      market: e.market ?? "za",
      summary: e.summary,
      channels: e.channels ?? [],
      tools: e.tools,
      evals: e.evals,
      marketplaceCategory: marketplaceCategory({
        id: e.id,
        name: e.name,
        version: "1",
        category: e.category as never,
        tier: e.tier as never,
        summary: e.summary,
        channels: e.channels ?? [],
        languages: ["en"],
        market: e.market,
        model: { primary: "claude-sonnet", temperature: 0.3, max_output_tokens: 700 },
      }),
      pilot: pilots.has(e.id) || Boolean(preset?.pilot),
      liveReady: Boolean(preset?.pilot) || (preset?.phase === 1 && Boolean(preset)),
    };
  });
}

export async function getAgentPackage(id: string): Promise<AgentPackage | null> {
  try {
    const raw = await fs.readFile(path.join(catalogDir(), `${id}.agent.json`), "utf8");
    return loadAgentPackage(JSON.parse(raw));
  } catch {
    return null;
  }
}
