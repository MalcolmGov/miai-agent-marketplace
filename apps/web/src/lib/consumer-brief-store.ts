import { promises as fs } from "node:fs";
import path from "node:path";
import { getPool, query } from "@/lib/pg";
import { ensureMigrations } from "@/lib/migrate";

export type BriefChannel = "app" | "whatsapp" | "email";

export type BriefConfig = {
  enabled: boolean;
  /** Local hour (0–23) to deliver the brief. */
  hour: number;
  /** IANA timezone, e.g. "Africa/Johannesburg", "America/New_York". */
  timezone: string;
  channel: BriefChannel;
};

export type BriefEntry = {
  text: string;
  generatedAt: string;
  tokensDebited: number;
};

export type BriefRecord = {
  config: BriefConfig;
  latest: BriefEntry | null;
  /** Local date (YYYY-MM-DD) the brief was last generated, to avoid double sends. */
  lastSentOn: string | null;
};

export const DEFAULT_BRIEF_CONFIG: BriefConfig = {
  enabled: false,
  hour: 7,
  timezone: "UTC",
  channel: "app",
};

function emptyRecord(): BriefRecord {
  return { config: { ...DEFAULT_BRIEF_CONFIG }, latest: null, lastSentOn: null };
}

// ---- file fallback (dev/test; no DATABASE_URL) ----

type FileShape = Record<string, BriefRecord>;
const g = globalThis as typeof globalThis & {
  __miaiBriefMem?: Map<string, BriefRecord>;
  __miaiBriefHydrated?: boolean;
};

function fileStorePath(): string {
  if (process.env.BRIEF_STORE_PATH) return path.resolve(process.env.BRIEF_STORE_PATH);
  return path.resolve(process.cwd(), "../../data/consumer-brief.json");
}

async function fileMem(): Promise<Map<string, BriefRecord>> {
  if (g.__miaiBriefMem && g.__miaiBriefHydrated) return g.__miaiBriefMem;
  const map = g.__miaiBriefMem ?? new Map<string, BriefRecord>();
  try {
    const raw = await fs.readFile(fileStorePath(), "utf8");
    for (const [k, v] of Object.entries(JSON.parse(raw) as FileShape)) map.set(k, v);
  } catch {
    /* no file yet */
  }
  g.__miaiBriefMem = map;
  g.__miaiBriefHydrated = true;
  return map;
}

async function fileWrite(map: Map<string, BriefRecord>): Promise<void> {
  const obj: FileShape = {};
  for (const [k, v] of map) obj[k] = v;
  await fs.writeFile(fileStorePath(), JSON.stringify(obj, null, 2), "utf8");
}

// ---- public API (pg when DATABASE_URL, else file) ----

export async function getBriefRecord(consumerId: string): Promise<BriefRecord> {
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      config: BriefConfig;
      latest: BriefEntry | null;
      last_sent_on: string | null;
    }>("SELECT config, latest, last_sent_on FROM miai_consumer_brief WHERE consumer_id = $1", [
      consumerId,
    ]);
    const row = res.rows[0];
    if (!row) return emptyRecord();
    return {
      config: { ...DEFAULT_BRIEF_CONFIG, ...row.config },
      latest: row.latest ?? null,
      lastSentOn: row.last_sent_on ?? null,
    };
  }
  const map = await fileMem();
  return map.get(consumerId) ?? emptyRecord();
}

export async function setBriefConfig(consumerId: string, config: BriefConfig): Promise<BriefRecord> {
  const current = await getBriefRecord(consumerId);
  const next: BriefRecord = { ...current, config };
  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_consumer_brief (consumer_id, config, latest, last_sent_on, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())
       ON CONFLICT (consumer_id) DO UPDATE SET config = $2::jsonb, updated_at = NOW()`,
      [
        consumerId,
        JSON.stringify(config),
        next.latest ? JSON.stringify(next.latest) : null,
        next.lastSentOn,
      ],
    );
  } else {
    const map = await fileMem();
    map.set(consumerId, next);
    await fileWrite(map);
  }
  return next;
}

export async function recordBriefSent(
  consumerId: string,
  entry: BriefEntry,
  localDate: string,
): Promise<void> {
  const current = await getBriefRecord(consumerId);
  const next: BriefRecord = { ...current, latest: entry, lastSentOn: localDate };
  if (getPool()) {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_consumer_brief (consumer_id, config, latest, last_sent_on, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, $4, NOW())
       ON CONFLICT (consumer_id) DO UPDATE SET latest = $3::jsonb, last_sent_on = $4, updated_at = NOW()`,
      [consumerId, JSON.stringify(current.config), JSON.stringify(entry), localDate],
    );
  } else {
    const map = await fileMem();
    map.set(consumerId, next);
    await fileWrite(map);
  }
}

export async function listBriefRecords(): Promise<Array<{ consumerId: string; record: BriefRecord }>> {
  if (getPool()) {
    await ensureMigrations();
    const res = await query<{
      consumer_id: string;
      config: BriefConfig;
      latest: BriefEntry | null;
      last_sent_on: string | null;
    }>("SELECT consumer_id, config, latest, last_sent_on FROM miai_consumer_brief");
    return res.rows.map((r) => ({
      consumerId: r.consumer_id,
      record: {
        config: { ...DEFAULT_BRIEF_CONFIG, ...r.config },
        latest: r.latest ?? null,
        lastSentOn: r.last_sent_on ?? null,
      },
    }));
  }
  const map = await fileMem();
  return [...map.entries()].map(([consumerId, record]) => ({ consumerId, record }));
}
