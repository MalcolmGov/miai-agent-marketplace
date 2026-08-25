import { promises as fs } from "fs";
import path from "path";
import { isSandbox } from "@/lib/sandbox";

/**
 * Personal (consumer) agent catalogue — the space for agents an individual or household
 * activates for THEMSELVES, distinct from the business marketplace ("hire for your business").
 *
 * Kept as a separate section (data/catalog-consumer) on purpose:
 * - the business rail's indexed numbers (100 families × 5 markets = 500) stay untouched;
 * - personal agents carry different semantics (household workspace, per-member caps,
 *   kid-safe fencing, session-priced prepaid SKUs) and a different browse surface.
 */
export interface PersonalAgentEntry {
  id: string;
  name: string;
  tier: string;
  category: string;
  market: string;
  audience: "personal";
  summary: string;
  channels: string[];
  languages: string[];
  tools: number;
  evals: number;
  readiness: string;
  /** true = behaviourally certified (3x-majority eval pass); false = authored, in certification. */
  certified: boolean;
  badges: string[];
  skus: string[];
}

function consumerCatalogDir(): string {
  return path.resolve(
    process.cwd(),
    process.env.CONSUMER_CATALOG_DIR ?? "../../data/catalog-consumer",
  );
}

type FileMemo<T> = { mtimeMs: number; data: T };
let memo: FileMemo<PersonalAgentEntry[]> | null = null;

export async function listPersonalAgents(): Promise<PersonalAgentEntry[]> {
  const file = path.join(consumerCatalogDir(), "index.json");
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return []; // section not present in this deployment — surface stays hidden
  }
  if (memo && memo.mtimeMs === stat.mtimeMs) return memo.data;
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as PersonalAgentEntry[];
  const data = raw.filter((e) => e && e.id && e.audience === "personal");
  memo = { mtimeMs: stat.mtimeMs, data };
  return data;
}

export async function getPersonalAgent(id: string): Promise<PersonalAgentEntry | null> {
  const all = await listPersonalAgents();
  return all.find((e) => e.id === id) ?? null;
}

/**
 * Whether a person can run this specialist in the current deployment: certified agents run on
 * production; in the sandbox every catalogued specialist runs (so a partner can evaluate them all).
 * The UI (card CTA, specialist chat vs. notice) uses this so it never offers a run that the runtime
 * gate (isRunnableConsumerAgent) would refuse. Because it reads SANDBOX_MODE at request time, the
 * pages that call it must render dynamically (the prod and sandbox images are identical).
 */
export function personalAgentRunnable(agent: PersonalAgentEntry): boolean {
  return agent.certified || isSandbox();
}
