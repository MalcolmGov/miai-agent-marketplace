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
}

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function storePath(): string {
  if (env("OAUTH_TOKEN_STORE_PATH")) return path.resolve(env("OAUTH_TOKEN_STORE_PATH")!);
  return path.resolve(process.cwd(), "../../data/oauth-tokens.json");
}

function secret(): string {
  return env("OAUTH_TOKEN_SECRET") ?? "dev-only-change-me";
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

const g = globalThis as typeof globalThis & { __miaiOauthTokens?: Map<string, StoredToken> };

function mem(): Map<string, StoredToken> {
  if (!g.__miaiOauthTokens) g.__miaiOauthTokens = new Map();
  return g.__miaiOauthTokens;
}

export function tokenKey(workspaceId: string, connectorId: string): string {
  return `${workspaceId}::${connectorId}`;
}

async function persist(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const out: DiskShape = {};
  for (const [k, v] of mem()) {
    out[k] = {
      ...v,
      accessToken: seal(v.accessToken),
      refreshToken: v.refreshToken ? seal(v.refreshToken) : undefined,
    };
  }
  await fs.writeFile(file, JSON.stringify(out, null, 2), "utf8");
}

async function hydrate(): Promise<void> {
  if (mem().size > 0) return;
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as DiskShape;
    for (const [k, v] of Object.entries(data)) {
      mem().set(k, {
        ...v,
        accessToken: open(v.accessToken),
        refreshToken: v.refreshToken ? open(v.refreshToken) : undefined,
      });
    }
  } catch {
    /* empty */
  }
}

export async function saveToken(token: StoredToken): Promise<void> {
  await hydrate();
  mem().set(tokenKey(token.workspaceId, token.connectorId), {
    ...token,
    updatedAt: new Date().toISOString(),
  });
  await persist();
}

export async function getToken(
  workspaceId: string,
  connectorId: string,
): Promise<StoredToken | null> {
  await hydrate();
  return mem().get(tokenKey(workspaceId, connectorId)) ?? null;
}

export async function deleteToken(workspaceId: string, connectorId: string): Promise<void> {
  await hydrate();
  mem().delete(tokenKey(workspaceId, connectorId));
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
