import fs from "node:fs/promises";
import path from "node:path";
import { listCatalog, listMarketPacks } from "@/lib/catalog";

/**
 * Per-market localization aggregates for the /markets page — union of the compliance regimes,
 * languages and channel mixes actually present across every regional pack in that market.
 * Computed from real pack manifests (not hand-written copy), memoized per index-file mtime.
 */

export interface MarketLocalization {
  market: string;
  label: string;
  flag: string;
  skus: number;
  compliance: string[];
  languages: string[];
  channels: string[];
}

const FLAGS: Record<string, string> = {
  us: "🇺🇸",
  eu: "🇪🇺",
  africa: "🌍",
  asia: "🌏",
  oceania: "🇦🇺",
};

const MARKET_ORDER = ["us", "eu", "africa", "asia", "oceania"];

function catalogDir(): string {
  return path.resolve(process.cwd(), process.env.CATALOG_DIR ?? "../../data/catalog");
}

let memo: { mtimeMs: number; data: MarketLocalization[] } | null = null;

export async function marketLocalizationMatrix(): Promise<MarketLocalization[]> {
  const dir = catalogDir();
  const indexPath = path.join(dir, "index.json");
  const stat = await fs.stat(indexPath);
  if (memo && memo.mtimeMs === stat.mtimeMs) return memo.data;

  const [entries, packs] = await Promise.all([listCatalog(), listMarketPacks()]);
  const labelByMarket = new Map(packs.map((p) => [p.id, p.label]));

  const acc = new Map<string, { skus: number; compliance: Set<string>; languages: Set<string>; channels: Set<string> }>();
  for (const m of MARKET_ORDER) {
    acc.set(m, { skus: 0, compliance: new Set(), languages: new Set(), channels: new Set() });
  }

  for (const e of entries) {
    const bucket = acc.get(e.market);
    if (!bucket) continue;
    bucket.skus += 1;
    for (const c of e.channels ?? []) bucket.channels.add(c);
    try {
      const raw = JSON.parse(await fs.readFile(path.join(dir, `${e.id}.agent.json`), "utf8")) as {
        manifest?: { compliance?: string[]; languages?: string[] };
      };
      for (const c of raw.manifest?.compliance ?? []) bucket.compliance.add(c);
      for (const l of raw.manifest?.languages ?? []) bucket.languages.add(l);
    } catch {
      /* unreadable pack — skip its manifest facts */
    }
  }

  const data: MarketLocalization[] = MARKET_ORDER.filter((m) => acc.has(m)).map((m) => {
    const b = acc.get(m)!;
    return {
      market: m,
      label: labelByMarket.get(m) ?? m.toUpperCase(),
      flag: FLAGS[m] ?? "🌐",
      skus: b.skus,
      compliance: [...b.compliance].sort(),
      languages: [...b.languages].sort(),
      channels: [...b.channels].sort(),
    };
  });

  memo = { mtimeMs: stat.mtimeMs, data };
  return data;
}

/** Localized summaries for one showcase family across the 5 markets (for the /markets example row). */
export async function showcaseSummaries(familyId: string): Promise<Array<{ market: string; label: string; flag: string; packId: string; summary: string }>> {
  const dir = catalogDir();
  const out: Array<{ market: string; label: string; flag: string; packId: string; summary: string }> = [];
  const packs = await listMarketPacks();
  const labelByMarket = new Map(packs.map((p) => [p.id, p.label]));
  for (const m of MARKET_ORDER) {
    const packId = `${m}-${familyId}`;
    try {
      const raw = JSON.parse(await fs.readFile(path.join(dir, `${packId}.agent.json`), "utf8")) as {
        manifest?: { summary?: string };
      };
      out.push({
        market: m,
        label: labelByMarket.get(m) ?? m.toUpperCase(),
        flag: FLAGS[m] ?? "🌐",
        packId,
        summary: raw.manifest?.summary ?? "",
      });
    } catch {
      /* family not present in this market */
    }
  }
  return out;
}
