import { promises as fs } from "fs";
import path from "path";
import {
  agentAudience,
  loadAgentPackage,
  marketplaceCategory,
  type AgentAudience,
  type AgentPackage,
} from "@miai/agent-protocol";
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
  audience: AgentAudience;
  pilot: boolean;
  liveReady: boolean;
  catalogueReady: boolean;
  familyId: string;
}

export interface FamilyEntry {
  id: string;
  name: string;
  tier: string;
  category: string;
  summary: string;
  channels: string[];
  marketplaceCategory: string;
  audience: AgentAudience;
  markets: Record<string, string>;
  packs: string[];
  hasZa: boolean;
  pilot: boolean;
  liveReady: boolean;
  catalogueReady: boolean;
  defaultAgentId: string;
}

export interface MarketPack {
  id: string;
  label: string;
  prefix: string;
}

const FAMILY_PREFIX_RE = /^(us|eu|africa|asia)-/;

function catalogDir(): string {
  return path.resolve(process.cwd(), process.env.CATALOG_DIR ?? "../../data/catalog");
}

export function familyIdFromAgentId(id: string): string {
  return id.replace(FAMILY_PREFIX_RE, "");
}

function pickDefaultAgentId(
  markets: Record<string, string>,
  preferredMarket?: string | null,
): string {
  if (preferredMarket && markets[preferredMarket]) return markets[preferredMarket];
  for (const m of ["us", "eu", "africa", "asia"]) {
    if (markets[m]) return markets[m];
  }
  return Object.values(markets)[0];
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
    readiness?: string;
  }>;
  const pilots = new Set(pilotAgentIds());
  return index.map((e) => {
    const preset = getPreset(e.id);
    const catalogueReady = e.readiness === "catalogue-ready";
    return {
      id: e.id,
      name: e.name,
      tier: e.tier,
      category: e.category,
      market: e.market === "za" ? "africa" : (e.market ?? "africa"),
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
      audience: agentAudience(e.category),
      pilot: pilots.has(e.id) || Boolean(preset?.pilot),
      liveReady: Boolean(preset?.pilot) || (catalogueReady && preset?.phase === 1),
      catalogueReady,
      familyId: familyIdFromAgentId(e.id),
    };
  });
}

export async function listMarketPacks(): Promise<MarketPack[]> {
  try {
    const raw = await fs.readFile(path.join(catalogDir(), "market-packs.json"), "utf8");
    const data = JSON.parse(raw) as { packs: MarketPack[] };
    return data.packs.map((p) => ({ id: p.id, label: p.label, prefix: p.prefix }));
  } catch {
    return [
      { id: "us", label: "US", prefix: "us-" },
      { id: "eu", label: "EU", prefix: "eu-" },
      { id: "africa", label: "Africa", prefix: "africa-" },
      { id: "asia", label: "Asia", prefix: "asia-" },
    ];
  }
}

export async function listFamilies(preferredMarket?: string | null): Promise<FamilyEntry[]> {
  const agents = await listCatalog();
  const byId = new Map(agents.map((a) => [a.id, a]));

  let familiesRaw: Array<{
    id: string;
    name: string;
    tier: string;
    category: string;
    summary: string;
    channels: string[];
    markets: Record<string, string>;
    packs: string[];
    hasZa: boolean;
    catalogueReady?: boolean;
    readiness?: string;
  }>;

  try {
    const raw = await fs.readFile(path.join(catalogDir(), "families.json"), "utf8");
    familiesRaw = JSON.parse(raw);
  } catch {
    const map = new Map<string, FamilyEntry["markets"]>();
    const meta = new Map<string, CatalogEntry>();
    for (const a of agents) {
      const fid = a.familyId;
      if (!map.has(fid)) map.set(fid, {});
      map.get(fid)![a.market] = a.id;
      if (!meta.has(fid)) meta.set(fid, a);
    }
    familiesRaw = [...map.entries()].map(([id, markets]) => {
      const m = meta.get(id)!;
      const variantIds = Object.values(markets);
      const catalogueReady = variantIds.every((vid) => byId.get(vid)?.catalogueReady);
      return {
        id,
        name: m.name.replace(/^(US|EU|Africa|Asia|ZA)\s+/i, ""),
        tier: m.tier,
        category: m.category,
        summary: m.summary,
        channels: m.channels,
        markets,
        packs: ["us", "eu", "africa", "asia"].filter((p) => markets[p]),
        hasZa: Boolean(markets.za),
        catalogueReady,
      };
    });
  }

  return familiesRaw.map((f) => {
    const variantIds = Object.values(f.markets);
    const variants = variantIds.map((id) => byId.get(id)).filter(Boolean) as CatalogEntry[];
    const defaultAgentId = pickDefaultAgentId(f.markets, preferredMarket);
    const defaultAgent = byId.get(defaultAgentId);
    const sample = defaultAgent ?? variants[0];
    const catalogueReady =
      f.catalogueReady ??
      (variants.length > 0 && variants.every((v) => v.catalogueReady));
    return {
      id: f.id,
      name: f.name,
      tier: f.tier,
      category: f.category,
      summary: f.summary || sample?.summary || "",
      channels: f.channels?.length ? f.channels : sample?.channels ?? [],
      marketplaceCategory:
        sample?.marketplaceCategory ??
        marketplaceCategory({
          id: f.id,
          name: f.name,
          version: "1",
          category: f.category as never,
          tier: f.tier as never,
          summary: f.summary,
          channels: f.channels ?? [],
          languages: ["en"],
          model: { primary: "claude-sonnet", temperature: 0.3, max_output_tokens: 700 },
        }),
      audience: agentAudience(f.category),
      markets: f.markets,
      packs: f.packs,
      hasZa: f.hasZa,
      pilot: variants.some((v) => v.pilot),
      liveReady: variants.some((v) => v.liveReady),
      catalogueReady,
      defaultAgentId,
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
