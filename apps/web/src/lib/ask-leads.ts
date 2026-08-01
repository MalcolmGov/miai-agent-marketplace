import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type AskLead = {
  id: string;
  name: string;
  contact: string;
  email?: string;
  company?: string;
  interest?: string;
  notes?: string;
  sessionId?: string;
  createdAt: string;
};

function storePath(): string {
  if (process.env.ASK_LEADS_PATH) return path.resolve(process.env.ASK_LEADS_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "ask-leads.json");
  return path.resolve(process.cwd(), "../../data/ask-leads.json");
}

const g = globalThis as typeof globalThis & {
  __miaiAskLeads?: {
    rows: AskLead[];
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function mem() {
  if (!g.__miaiAskLeads) {
    g.__miaiAskLeads = { rows: [], hydrated: false };
  }
  return g.__miaiAskLeads;
}

async function hydrate(): Promise<void> {
  const s = mem();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    try {
      const raw = await fs.readFile(storePath(), "utf8");
      const data = JSON.parse(raw) as AskLead[];
      s.rows = Array.isArray(data) ? data : [];
    } catch {
      s.rows = [];
    }
    s.hydrated = true;
    s.hydrating = undefined;
  })();
  return s.hydrating;
}

async function persist(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(mem().rows, null, 2), "utf8");
}

export async function listAskLeads(limit = 100): Promise<AskLead[]> {
  await hydrate();
  return [...mem().rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function createAskLead(input: {
  name: string;
  contact: string;
  email?: string;
  company?: string;
  interest?: string;
  notes?: string;
  sessionId?: string;
}): Promise<AskLead> {
  await hydrate();
  const row: AskLead = {
    id: `lead_${randomBytes(6).toString("hex")}`,
    name: input.name.trim(),
    contact: input.contact.trim(),
    email: input.email?.trim() || undefined,
    company: input.company?.trim() || undefined,
    interest: input.interest?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    sessionId: input.sessionId,
    createdAt: new Date().toISOString(),
  };
  mem().rows.unshift(row);
  if (mem().rows.length > 2000) mem().rows.length = 2000;
  await persist();
  return row;
}
