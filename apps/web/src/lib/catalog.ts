import { promises as fs } from "fs";
import path from "path";
import {
  agentAudience,
  loadAgentPackage,
  marketplaceCategory,
  type AgentAudience,
  type AgentPackage,
} from "@miai/agent-protocol";

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

const FAMILY_PREFIX_RE = /^(us|eu|africa|asia|oceania)-/;

/** Indexed commercial catalogue: 100 families × 5 regions (ZA is Africa, not a 6th market). */
export const INDEXED_MARKETS = ["us", "eu", "africa", "asia", "oceania"] as const;
export const INDEXED_AGENT_COUNT = 500;

function catalogDir(): string {
  return path.resolve(process.cwd(), process.env.CATALOG_DIR ?? "../../data/catalog");
}

export function familyIdFromAgentId(id: string): string {
  return id.replace(FAMILY_PREFIX_RE, "");
}

/**
 * Public market map for UI/API: 5 regions only.
 * Legacy `za` aliases fold into `africa` (same SKU entitlement).
 */
export function publicMarkets(markets: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of INDEXED_MARKETS) {
    if (k === "africa") {
      const id = markets.africa || markets.za;
      if (id) out.africa = id;
    } else if (markets[k]) {
      out[k] = markets[k];
    }
  }
  return out;
}

export function countIndexedMarketSkus(markets: Record<string, string>): number {
  return Object.keys(publicMarkets(markets)).length;
}

function pickDefaultAgentId(
  markets: Record<string, string>,
  preferredMarket?: string | null,
): string {
  const pub = publicMarkets(markets);
  const pref =
    preferredMarket === "za" ? "africa" : preferredMarket && preferredMarket !== "all"
      ? preferredMarket
      : null;
  if (pref && pub[pref]) return pub[pref];
  for (const m of INDEXED_MARKETS) {
    if (pub[m]) return pub[m];
  }
  return Object.values(pub)[0] ?? Object.values(markets)[0];
}

type FileMemo<T> = { mtimeMs: number; data: T };

let catalogMemo: FileMemo<CatalogEntry[]> | null = null;
let familiesMemo: FileMemo<
  Array<{
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
  }>
> | null = null;

function parseCatalogIndex(
  index: Array<{
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
  }>,
): CatalogEntry[] {
  return index.map((e) => {
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
      pilot: false,
      liveReady: catalogueReady,
      catalogueReady,
      familyId: familyIdFromAgentId(e.id),
    };
  });
}

export async function listCatalog(): Promise<CatalogEntry[]> {
  const indexPath = path.join(catalogDir(), "index.json");
  const stat = await fs.stat(indexPath);
  if (catalogMemo && catalogMemo.mtimeMs === stat.mtimeMs) {
    return catalogMemo.data;
  }
  const raw = await fs.readFile(indexPath, "utf8");
  const index = JSON.parse(raw) as Parameters<typeof parseCatalogIndex>[0];
  const data = parseCatalogIndex(index);
  catalogMemo = { mtimeMs: stat.mtimeMs, data };
  return data;
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
      { id: "oceania", label: "Oceania", prefix: "oceania-" },
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
    const familiesPath = path.join(catalogDir(), "families.json");
    const stat = await fs.stat(familiesPath);
    if (familiesMemo && familiesMemo.mtimeMs === stat.mtimeMs) {
      familiesRaw = familiesMemo.data;
    } else {
      const raw = await fs.readFile(familiesPath, "utf8");
      familiesRaw = JSON.parse(raw);
      familiesMemo = { mtimeMs: stat.mtimeMs, data: familiesRaw };
    }
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
        packs: ["us", "eu", "africa", "asia", "oceania"].filter((p) => markets[p]),
        hasZa: Boolean(markets.za),
        catalogueReady,
      };
    });
  }

  return familiesRaw.map((f) => {
    const markets = publicMarkets(f.markets);
    const variantIds = Object.values(markets);
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
      markets,
      packs: INDEXED_MARKETS.filter((p) => Boolean(markets[p])),
      // Legacy flag for integrity tooling; ZA is not a separate commercial market.
      hasZa: Boolean(f.hasZa || f.markets?.za),
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
    // Not in the business catalogue — try the consumer section (personal agents live there and
    // are run by the consumer line). Same package format; different directory.
    try {
      const dir = path.resolve(
        process.cwd(),
        process.env.CONSUMER_CATALOG_DIR ?? "../../data/catalog-consumer",
      );
      const raw = await fs.readFile(path.join(dir, `${id}.agent.json`), "utf8");
      return loadAgentPackage(JSON.parse(raw));
    } catch {
      return null;
    }
  }
}
