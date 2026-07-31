import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

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
};

function mem(): Map<string, KnowledgeSource[]> {
  if (!g.__miaiKnowledge) g.__miaiKnowledge = new Map();
  return g.__miaiKnowledge;
}

function key(workspaceId: string, agentId: string): string {
  return `${workspaceId}::${agentId}`;
}

async function hydrate(): Promise<void> {
  if (mem().size > 0) return;
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as Record<string, KnowledgeSource[]>;
    for (const [k, v] of Object.entries(data)) mem().set(k, v);
  } catch {
    /* empty */
  }
}

async function persist(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const out: Record<string, KnowledgeSource[]> = {};
  for (const [k, v] of mem()) out[k] = v;
  await fs.writeFile(file, JSON.stringify(out, null, 2), "utf8");
}

export async function listKnowledgeSources(
  workspaceId: string,
  agentId: string,
): Promise<KnowledgeSource[]> {
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
  await persist();
  return next;
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

export async function getComposedKnowledge(
  workspaceId: string,
  agentId: string,
  base: string,
): Promise<string> {
  const sources = await listKnowledgeSources(workspaceId, agentId);
  return composeKnowledge(base, sources);
}
