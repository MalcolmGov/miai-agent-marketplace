import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { ensureMigrations } from "@/lib/migrate";
import { databaseUrl, query } from "@/lib/pg";

export type KnowledgeSourceType = "paste" | "file" | "website";

export interface KnowledgeSource {
  id: string;
  workspaceId: string;
  agentId: string;
  type: KnowledgeSourceType;
  title: string;
  content: string;
  url?: string;
  filename?: string;
  mime?: string;
  status: "ready" | "processing" | "error";
  error?: string;
  createdAt: string;
  chars: number;
}

function env(name: string): string | undefined {
  return process.env[name];
}

function storePath(): string {
  if (env("KNOWLEDGE_STORE_PATH")) return path.resolve(env("KNOWLEDGE_STORE_PATH")!);
  return path.resolve(process.cwd(), "../../data/knowledge-sources.json");
}

const g = globalThis as typeof globalThis & {
  __miaiKnowledge?: Map<string, KnowledgeSource[]>;
  __miaiKnowledgeHydrated?: boolean;
  __miaiKnowledgeHydrating?: Promise<void>;
};

function mem(): Map<string, KnowledgeSource[]> {
  if (!g.__miaiKnowledge) g.__miaiKnowledge = new Map();
  return g.__miaiKnowledge;
}

function key(workspaceId: string, agentId: string): string {
  return `${workspaceId}::${agentId}`;
}

async function hydrateFromPostgres(): Promise<boolean> {
  if (!databaseUrl()) return false;
  try {
    await ensureMigrations();
    const res = await query<{
      workspace_id: string;
      agent_id: string;
      payload: KnowledgeSource;
    }>("SELECT workspace_id, agent_id, payload FROM miai_knowledge_sources");
    for (const row of res.rows) {
      const k = key(row.workspace_id, row.agent_id);
      const list = mem().get(k) ?? [];
      list.push(row.payload);
      mem().set(k, list);
    }
    return true;
  } catch (err) {
    console.error("[knowledge] postgres hydrate failed", err);
    return false;
  }
}

async function hydrateFromFile(): Promise<void> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as Record<string, KnowledgeSource[]>;
    for (const [k, v] of Object.entries(data)) mem().set(k, v);
  } catch {
    /* empty */
  }
}

async function hydrate(): Promise<void> {
  if (g.__miaiKnowledgeHydrated) return;
  if (g.__miaiKnowledgeHydrating) return g.__miaiKnowledgeHydrating;
  g.__miaiKnowledgeHydrating = (async () => {
    const fromPg = await hydrateFromPostgres();
    if (!fromPg) await hydrateFromFile();
    g.__miaiKnowledgeHydrated = true;
    g.__miaiKnowledgeHydrating = undefined;
  })();
  return g.__miaiKnowledgeHydrating;
}

async function persistToFile(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const out: Record<string, KnowledgeSource[]> = {};
  for (const [k, v] of mem()) out[k] = v;
  await fs.writeFile(file, JSON.stringify(out, null, 2), "utf8");
}

async function upsertSourcePostgres(source: KnowledgeSource): Promise<void> {
  if (!databaseUrl()) return;
  try {
    await query(
      `INSERT INTO miai_knowledge_sources (id, workspace_id, agent_id, payload, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [source.id, source.workspaceId, source.agentId, JSON.stringify(source)],
    );
  } catch (err) {
    console.error("[knowledge] postgres upsert failed", err);
  }
}

async function deleteSourcePostgres(sourceId: string): Promise<void> {
  if (!databaseUrl()) return;
  try {
    await query("DELETE FROM miai_knowledge_sources WHERE id = $1", [sourceId]);
  } catch (err) {
    console.error("[knowledge] postgres delete failed", err);
  }
}

async function persist(): Promise<void> {
  await persistToFile();
}

export async function listKnowledgeSources(
  workspaceId: string,
  agentId: string,
): Promise<KnowledgeSource[]> {
  // Read from Postgres directly when configured. The in-process Map is hydrated once at cold start
  // and never refreshed, so on a multi-replica deployment a source uploaded (or deleted) on one
  // instance is missing from (or lingers on) another — and getComposedKnowledge feeds this straight
  // into the live agent prompt, so the agent answered with stale/deleted knowledge. The Map stays
  // as the no-database fallback.
  if (databaseUrl()) {
    await ensureMigrations();
    const res = await query<{ payload: KnowledgeSource }>(
      "SELECT payload FROM miai_knowledge_sources WHERE workspace_id = $1 AND agent_id = $2",
      [workspaceId, agentId],
    );
    return res.rows.map((r) => r.payload).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await hydrate();
  return [...(mem().get(key(workspaceId, agentId)) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function addKnowledgeSource(
  source: Omit<KnowledgeSource, "id" | "createdAt" | "chars"> & { id?: string },
): Promise<KnowledgeSource> {
  await hydrate();
  const row: KnowledgeSource = {
    ...source,
    id: source.id ?? `ks_${randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    chars: source.content.length,
  };
  const k = key(source.workspaceId, source.agentId);
  const list = mem().get(k) ?? [];
  list.unshift(row);
  mem().set(k, list);
  await upsertSourcePostgres(row);
  await persist();
  return row;
}

export async function updateKnowledgeSource(
  workspaceId: string,
  agentId: string,
  sourceId: string,
  patch: Partial<KnowledgeSource>,
): Promise<KnowledgeSource | null> {
  await hydrate();
  const k = key(workspaceId, agentId);
  const list = mem().get(k) ?? [];
  const idx = list.findIndex((s) => s.id === sourceId);
  if (idx < 0) return null;
  const next = {
    ...list[idx],
    ...patch,
    chars: (patch.content ?? list[idx].content).length,
  };
  list[idx] = next;
  mem().set(k, list);
  await upsertSourcePostgres(next);
  await persist();
  return next;
}

/** List every knowledge source across all agents in a workspace (DSAR export). */
export async function listKnowledgeSourcesForWorkspace(
  workspaceId: string,
): Promise<KnowledgeSource[]> {
  await hydrate();
  const out: KnowledgeSource[] = [];
  for (const [k, sources] of mem().entries()) {
    if (!k.startsWith(`${workspaceId}::`)) continue;
    out.push(...sources);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Delete all knowledge sources for every agent in a workspace. */
export async function deleteKnowledgeForWorkspace(workspaceId: string): Promise<number> {
  await hydrate();
  let deleted = 0;
  for (const [k, sources] of [...mem().entries()]) {
    if (!k.startsWith(`${workspaceId}::`)) continue;
    deleted += sources.length;
    mem().delete(k);
  }
  if (databaseUrl()) {
    try {
      await query("DELETE FROM miai_knowledge_sources WHERE workspace_id = $1", [workspaceId]);
    } catch (err) {
      console.error("[knowledge] postgres workspace delete failed", err);
    }
  }
  await persist();
  return deleted;
}

/**
 * Delete every ingested source for one agent — used when the agent itself is deleted from the
 * workspace, so "delete" really means the tenant's uploaded knowledge goes with it (no orphans
 * that would silently re-attach if the agent is rented again).
 */
export async function deleteKnowledgeForAgent(
  workspaceId: string,
  agentId: string,
): Promise<number> {
  await hydrate();
  const k = key(workspaceId, agentId);
  const deleted = (mem().get(k) ?? []).length;
  mem().delete(k);
  if (databaseUrl()) {
    try {
      await query("DELETE FROM miai_knowledge_sources WHERE workspace_id = $1 AND agent_id = $2", [
        workspaceId,
        agentId,
      ]);
    } catch (err) {
      console.error("[knowledge] postgres agent delete failed", err);
    }
  }
  await persist();
  return deleted;
}

export async function deleteKnowledgeSource(
  workspaceId: string,
  agentId: string,
  sourceId: string,
): Promise<boolean> {
  await hydrate();
  const k = key(workspaceId, agentId);
  const list = mem().get(k) ?? [];
  const next = list.filter((s) => s.id !== sourceId);
  if (next.length === list.length) return false;
  mem().set(k, next);
  await deleteSourcePostgres(sourceId);
  await persist();
  return true;
}

/** Compose base knowledge + ingested sources for the runtime prompt.
 * Uploaded/pasted/crawled sources are placed first so they survive the
 * runtime prompt budget (catalogue templates are secondary). */
export function composeKnowledge(base: string, sources: KnowledgeSource[]): string {
  const max = Number(process.env.KNOWLEDGE_MAX_CHARS ?? 80_000);
  const ready = sources.filter((x) => x.status === "ready" && x.content.trim());
  const parts: string[] = [];

  for (const s of ready) {
    const header =
      s.type === "website"
        ? `## Website: ${s.title}${s.url ? ` (${s.url})` : ""}`
        : s.type === "file"
          ? `## File: ${s.title}`
          : `## Notes: ${s.title}`;
    parts.push(`${header}\n\n${s.content.trim()}`);
  }

  const trimmed = base.trim();
  if (trimmed) {
    // When the tenant uploaded their own knowledge, keep only a short catalogue
    // excerpt so onboarding docs aren't crowded out of the model context.
    const baseBudget = ready.length
      ? Math.min(4_000, Math.max(1_500, max - parts.join("").length - 500))
      : max;
    const baseBody =
      trimmed.length > baseBudget
        ? trimmed.slice(0, baseBudget) + "\n\n[…catalogue template truncated]"
        : trimmed;
    parts.push(
      (ready.length ? "# Catalogue template (secondary)\n\n" : "# Business knowledge (edited)\n\n") +
        baseBody,
    );
  }

  const joined = parts.join("\n\n---\n\n");
  return joined.length > max ? joined.slice(0, max) + "\n\n[…truncated for length]" : joined;
}

/**
 * Compose an agent's base knowledge with the extra sources registered for a given OWNER.
 *
 * `ownerId` is the ACCESS BOUNDARY for knowledge — sources are keyed by it. Callers MUST pass an
 * AUTH-DERIVED id, never a client-supplied tenant: the business / embed paths pass their verified
 * workspaceId; the CONSUMER path passes the authenticated person's walletId (= userId), NOT the
 * client-supplied `?workspaceId=` brand. Passing a client-controlled id here would turn brand
 * knowledge into a cross-tenant read. (Journey #10 hardening — the param was previously named
 * `workspaceId`, which invited exactly that mistake on the consumer path.)
 */
export async function getComposedKnowledge(
  ownerId: string,
  agentId: string,
  base: string,
): Promise<string> {
  const sources = await listKnowledgeSources(ownerId, agentId);
  return composeKnowledge(base, sources);
}

/**
 * True when this owner+agent has at least one ingested source with usable content.
 * The live path uses this to tell "the tenant cleared the profile field and has nothing else" (show
 * the not-configured notice) apart from "profile empty, but uploaded sources exist" (sources only).
 */
export async function hasReadyKnowledgeSources(ownerId: string, agentId: string): Promise<boolean> {
  const sources = await listKnowledgeSources(ownerId, agentId);
  return sources.some((s) => s.status === "ready" && s.content.trim().length > 0);
}
