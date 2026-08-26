import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { Pool } from "pg";
import type { OAuthConnectorId } from "./providers.js";

export interface StoredToken {
  connectorId: OAuthConnectorId | string;
  workspaceId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  /** shopify shop, zendesk subdomain, qb realmId, xero tenantId, slack team, etc. */
  meta: Record<string, string>;
  updatedAt: string;
}

/** Public metadata for DSAR / Trust — never includes token material. */
export interface TokenMeta {
  connectorId: string;
  workspaceId: string;
  scope?: string;
  meta: Record<string, string>;
  updatedAt: string;
  expiresAt?: number;
  /** Last read-only verification (verifyConnector): true = working, false = broken, undefined = never checked. */
  verified?: boolean;
  verifiedAt?: string;
  verifyError?: string;
}

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function databaseUrl(): string | undefined {
  const url = env("DATABASE_URL")?.trim() || env("MIAI_DATABASE_URL")?.trim();
  return url || undefined;
}

function sslFor(url: string): boolean | { rejectUnauthorized: boolean } {
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  // Match web pg.ts: verify by default; opt out with PG_SSL_REJECT_UNAUTHORIZED=0.
  if (env("PG_SSL_REJECT_UNAUTHORIZED") === "0") {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: true };
}

function storePath(): string {
  if (env("OAUTH_TOKEN_STORE_PATH")) return path.resolve(env("OAUTH_TOKEN_STORE_PATH")!);
  return path.resolve(process.cwd(), "../../data/oauth-tokens.json");
}

function secret(): string {
  const s = env("OAUTH_TOKEN_SECRET") ?? "dev-only-change-me";
  if (
    env("NODE_ENV") === "production" &&
    (s === "dev-only-change-me" || s === "replace-with-long-random-string" || s.length < 16)
  ) {
    throw new Error("OAUTH_TOKEN_SECRET missing or weak in production");
  }
  return s;
}

/** 32-byte key derived from the configured secret. */
function aesKey(): Buffer {
  return createHash("sha256").update(secret()).digest();
}

/**
 * Encrypt at rest with AES-256-GCM (`v2.`).
 * Still accepts legacy HMAC-sealed `v1.` and plaintext for migration.
 */
function seal(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2.${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

function open(sealed: string): string {
  if (sealed.startsWith("v2.")) {
    const parts = sealed.split(".");
    if (parts.length !== 4) throw new Error("Invalid v2 token envelope");
    const [, ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64!, "base64url");
    const tag = Buffer.from(tagB64!, "base64url");
    const data = Buffer.from(dataB64!, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }
  if (sealed.startsWith("v1.")) {
    // Legacy HMAC seal (integrity only) — migrate on next persist
    const [, iv, mac, payload] = sealed.split(".");
    const value = Buffer.from(payload!, "base64url").toString("utf8");
    const expected = createHmac("sha256", secret()).update(`${iv}:${value}`).digest("hex");
    const a = Buffer.from(mac!);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Token MAC mismatch");
    return value;
  }
  return sealed; // plain for migration/dev
}

type DiskShape = Record<
  string,
  Omit<StoredToken, "accessToken" | "refreshToken"> & {
    accessToken: string;
    refreshToken?: string;
  }
>;

type SealedRow = Omit<StoredToken, "accessToken" | "refreshToken"> & {
  accessToken: string;
  refreshToken?: string;
};

const g = globalThis as typeof globalThis & {
  __miaiOauthTokens?: Map<string, StoredToken>;
  __miaiOauthTokensHydrated?: boolean;
  __miaiOauthTokensHydrating?: Promise<void>;
  __miaiOauthPgPool?: Pool | null;
  __miaiOauthPgReady?: Promise<Pool | null>;
};

function mem(): Map<string, StoredToken> {
  if (!g.__miaiOauthTokens) g.__miaiOauthTokens = new Map();
  return g.__miaiOauthTokens;
}

export function tokenKey(workspaceId: string, connectorId: string): string {
  return `${workspaceId}::${connectorId}`;
}

function toSealedRow(token: StoredToken): SealedRow {
  return {
    ...token,
    accessToken: seal(token.accessToken),
    refreshToken: token.refreshToken ? seal(token.refreshToken) : undefined,
  };
}

function fromSealedRow(row: SealedRow): StoredToken {
  return {
    ...row,
    accessToken: open(row.accessToken),
    refreshToken: row.refreshToken ? open(row.refreshToken) : undefined,
  };
}

async function getPgPool(): Promise<Pool | null> {
  const url = databaseUrl();
  if (!url) return null;
  if (g.__miaiOauthPgPool) return g.__miaiOauthPgPool;
  if (g.__miaiOauthPgReady) return g.__miaiOauthPgReady;
  g.__miaiOauthPgReady = (async () => {
    const pgMod = await import("pg");
    const PoolClass = pgMod.default?.Pool ?? pgMod.Pool;
    const pool = new PoolClass({ connectionString: url, ssl: sslFor(url) });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS miai_oauth_tokens (
        workspace_id TEXT NOT NULL,
        connector TEXT NOT NULL,
        sealed JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workspace_id, connector)
      );
    `);
    g.__miaiOauthPgPool = pool;
    return pool;
  })();
  return g.__miaiOauthPgReady;
}

async function hydrateFromPostgres(): Promise<boolean> {
  const pool = await getPgPool();
  if (!pool) return false;
  try {
    const res = await pool.query<{ workspace_id: string; connector: string; sealed: SealedRow }>(
      "SELECT workspace_id, connector, sealed FROM miai_oauth_tokens",
    );
    for (const row of res.rows) {
      const k = tokenKey(row.workspace_id, row.connector);
      mem().set(k, fromSealedRow(row.sealed));
    }
    return true;
  } catch (err) {
    console.error("[oauth/tokens] postgres hydrate failed", err);
    return false;
  }
}

async function hydrateFromFile(): Promise<void> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as DiskShape;
    for (const [k, v] of Object.entries(data)) {
      mem().set(k, fromSealedRow(v));
    }
  } catch {
    /* empty */
  }
}

async function hydrate(): Promise<void> {
  if (g.__miaiOauthTokensHydrated) return;
  if (g.__miaiOauthTokensHydrating) return g.__miaiOauthTokensHydrating;
  g.__miaiOauthTokensHydrating = (async () => {
    const fromPg = await hydrateFromPostgres();
    if (!fromPg) await hydrateFromFile();
    g.__miaiOauthTokensHydrated = true;
    g.__miaiOauthTokensHydrating = undefined;
  })();
  return g.__miaiOauthTokensHydrating;
}

async function loadTokenFromPostgres(
  workspaceId: string,
  connectorId: string,
): Promise<StoredToken | null> {
  const pool = await getPgPool();
  if (!pool) return null;
  try {
    const res = await pool.query<{ sealed: SealedRow }>(
      "SELECT sealed FROM miai_oauth_tokens WHERE workspace_id = $1 AND connector = $2",
      [workspaceId, connectorId],
    );
    const row = res.rows[0];
    if (!row) return null;
    const token = fromSealedRow(row.sealed);
    mem().set(tokenKey(workspaceId, connectorId), token);
    return token;
  } catch (err) {
    console.error("[oauth/tokens] postgres get failed", err);
    return null;
  }
}

async function upsertTokenPostgres(token: StoredToken): Promise<void> {
  const pool = await getPgPool();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO miai_oauth_tokens (workspace_id, connector, sealed, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (workspace_id, connector)
       DO UPDATE SET sealed = EXCLUDED.sealed, updated_at = NOW()`,
      [token.workspaceId, token.connectorId, JSON.stringify(toSealedRow(token))],
    );
  } catch (err) {
    console.error("[oauth/tokens] postgres upsert failed", err);
  }
}

async function deleteTokenPostgres(workspaceId: string, connectorId: string): Promise<void> {
  const pool = await getPgPool();
  if (!pool) return;
  try {
    await pool.query("DELETE FROM miai_oauth_tokens WHERE workspace_id = $1 AND connector = $2", [
      workspaceId,
      connectorId,
    ]);
  } catch (err) {
    console.error("[oauth/tokens] postgres delete failed", err);
  }
}

async function persistToFile(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const out: DiskShape = {};
  for (const [k, v] of mem()) {
    out[k] = toSealedRow(v);
  }
  await fs.writeFile(file, JSON.stringify(out, null, 2), "utf8");
}

async function persist(): Promise<void> {
  await persistToFile();
}

export async function saveToken(token: StoredToken): Promise<void> {
  await hydrate();
  const next = { ...token, updatedAt: new Date().toISOString() };
  mem().set(tokenKey(token.workspaceId, token.connectorId), next);
  await upsertTokenPostgres(next);
  await persist();
}

export async function getToken(
  workspaceId: string,
  connectorId: string,
): Promise<StoredToken | null> {
  await hydrate();
  const k = tokenKey(workspaceId, connectorId);
  const hit = mem().get(k);
  if (hit) return hit;
  return loadTokenFromPostgres(workspaceId, connectorId);
}

export async function deleteToken(workspaceId: string, connectorId: string): Promise<void> {
  await hydrate();
  mem().delete(tokenKey(workspaceId, connectorId));
  await deleteTokenPostgres(workspaceId, connectorId);
  await persist();
}

export async function listConnected(workspaceId: string): Promise<string[]> {
  await hydrate();
  return [...mem().values()]
    .filter((t) => t.workspaceId === workspaceId)
    .map((t) => t.connectorId);
}

/** Connector metadata without access/refresh tokens — for DSAR exports. */
export async function listTokenMeta(workspaceId: string): Promise<TokenMeta[]> {
  await hydrate();
  return [...mem().values()]
    .filter((t) => t.workspaceId === workspaceId)
    .map((t) => ({
      connectorId: t.connectorId,
      workspaceId: t.workspaceId,
      scope: t.scope,
      meta: { ...t.meta },
      updatedAt: t.updatedAt,
      expiresAt: t.expiresAt,
      verified:
        t.meta.verify_status === "ok"
          ? true
          : t.meta.verify_status === "failed"
            ? false
            : undefined,
      verifiedAt: t.meta.verify_at || undefined,
      verifyError: t.meta.verify_error || undefined,
    }));
}

export async function updateTokenFields(
  workspaceId: string,
  connectorId: string,
  patch: Partial<StoredToken>,
): Promise<StoredToken | null> {
  const cur = await getToken(workspaceId, connectorId);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  await saveToken(next);
  return next;
}
