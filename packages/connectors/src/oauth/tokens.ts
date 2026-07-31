import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

function storePath(): string {
  if (env("OAUTH_TOKEN_STORE_PATH")) return path.resolve(env("OAUTH_TOKEN_STORE_PATH")!);
  // Prefer monorepo data/ when running from apps/web
  return path.resolve(process.cwd(), "../../data/oauth-tokens.json");
}

function secret(): string {
  return env("OAUTH_TOKEN_SECRET") ?? "dev-only-change-me";
}

function seal(value: string): string {
  const key = secret();
  const iv = randomBytes(8).toString("hex");
  const mac = createHmac("sha256", key).update(`${iv}:${value}`).digest("hex");
  const payload = Buffer.from(value, "utf8").toString("base64url");
  return `v1.${iv}.${mac}.${payload}`;
}

function open(sealed: string): string {
  if (!sealed.startsWith("v1.")) return sealed; // plain for migration/dev
  const [, iv, mac, payload] = sealed.split(".");
  const value = Buffer.from(payload, "base64url").toString("utf8");
  const expected = createHmac("sha256", secret()).update(`${iv}:${value}`).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Token MAC mismatch");
  return value;
}

type DiskShape = Record<string, Omit<StoredToken, "accessToken" | "refreshToken"> & {
  accessToken: string;
  refreshToken?: string;
}>;

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
