import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type CustomRequestStatus = "new" | "reviewing" | "scoped" | "done" | "declined";
export type CustomRequestSource = "Dashboard" | "Marketing page" | "Create";

export type CustomRequest = {
  id: string;
  business: string;
  need: string;
  source: CustomRequestSource;
  status: CustomRequestStatus;
  workspaceId?: string;
  contactEmail?: string;
  contactName?: string;
  channel?: string;
  createdAt: string;
  updatedAt: string;
};

function storePath(): string {
  if (process.env.CUSTOM_REQUESTS_PATH) return path.resolve(process.env.CUSTOM_REQUESTS_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "custom-requests.json");
  return path.resolve(process.cwd(), "../../data/custom-requests.json");
}

const g = globalThis as typeof globalThis & {
  __miaiCustomRequests?: {
    rows: CustomRequest[];
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function mem() {
  if (!g.__miaiCustomRequests) {
    g.__miaiCustomRequests = { rows: [], hydrated: false };
  }
  return g.__miaiCustomRequests;
}

async function hydrate(): Promise<void> {
  const s = mem();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    try {
      const raw = await fs.readFile(storePath(), "utf8");
      const data = JSON.parse(raw) as CustomRequest[];
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

export async function listCustomRequests(opts?: {
  status?: CustomRequestStatus;
}): Promise<CustomRequest[]> {
  await hydrate();
  let rows = [...mem().rows];
  if (opts?.status) rows = rows.filter((r) => r.status === opts.status);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCustomRequest(input: {
  business: string;
  need: string;
  source: CustomRequestSource;
  workspaceId?: string;
  contactEmail?: string;
  contactName?: string;
  channel?: string;
}): Promise<CustomRequest> {
  await hydrate();
  const now = new Date().toISOString();
  const row: CustomRequest = {
    id: `req_${randomBytes(6).toString("hex")}`,
    business: input.business.trim(),
    need: input.need.trim(),
    source: input.source,
    status: "new",
    workspaceId: input.workspaceId,
    contactEmail: input.contactEmail?.trim() || undefined,
    contactName: input.contactName?.trim() || undefined,
    channel: input.channel?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  mem().rows.unshift(row);
  await persist();
  return row;
}

export async function updateCustomRequest(
  id: string,
  patch: Partial<Pick<CustomRequest, "status" | "need" | "business">>,
): Promise<CustomRequest | null> {
  await hydrate();
  const idx = mem().rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const cur = mem().rows[idx]!;
  const next: CustomRequest = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  mem().rows[idx] = next;
  await persist();
  return next;
}
