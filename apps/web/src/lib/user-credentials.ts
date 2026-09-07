import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { ensureMigrations } from "@/lib/migrate";
import { databaseUrl, query } from "@/lib/pg";

export interface UserCredential {
  email: string;
  userId: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
}

type StoreFile = {
  users: Record<string, UserCredential>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function storePath(): string {
  if (process.env.USER_CREDENTIALS_PATH) return path.resolve(process.env.USER_CREDENTIALS_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "user-credentials.json");
  return path.resolve(process.cwd(), "../../data/user-credentials.json");
}

const g = globalThis as typeof globalThis & {
  __miaiUserCredentials?: {
    data: StoreFile;
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function mem() {
  if (!g.__miaiUserCredentials) {
    g.__miaiUserCredentials = {
      data: { users: {} },
      hydrated: false,
    };
  }
  return g.__miaiUserCredentials;
}

async function hydrateFromPostgres(): Promise<boolean> {
  if (!databaseUrl()) return false;
  try {
    await ensureMigrations();
    const res = await query<{
      email: string;
      user_id: string;
      password_hash: string;
      password_salt: string;
      created_at: string;
      updated_at: string;
    }>(
      "SELECT email, user_id, password_hash, password_salt, created_at, updated_at FROM miai_user_credentials",
    );
    const users: Record<string, UserCredential> = {};
    for (const row of res.rows) {
      users[row.email.toLowerCase()] = {
        email: row.email.toLowerCase(),
        userId: row.user_id,
        passwordHash: row.password_hash,
        passwordSalt: row.password_salt,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
    }
    mem().data = { users };
    return true;
  } catch (err) {
    console.error("[user-credentials] postgres hydrate failed", err);
    return false;
  }
}

async function hydrateFromFile(): Promise<void> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    mem().data = {
      users: parsed?.users && typeof parsed.users === "object" ? parsed.users : {},
    };
  } catch {
    mem().data = { users: {} };
  }
}

async function hydrate(): Promise<void> {
  const s = mem();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    const fromPg = await hydrateFromPostgres();
    if (!fromPg) await hydrateFromFile();
    s.hydrated = true;
    s.hydrating = undefined;
  })();
  return s.hydrating;
}

async function persistToFile(): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(mem().data, null, 2), "utf8");
}

async function persistPostgres(cred: UserCredential): Promise<void> {
  if (!databaseUrl()) return;
  try {
    await ensureMigrations();
    await query(
      `INSERT INTO miai_user_credentials (email, user_id, password_hash, password_salt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         password_salt = EXCLUDED.password_salt,
         updated_at = EXCLUDED.updated_at`,
      [
        cred.email,
        cred.userId,
        cred.passwordHash,
        cred.passwordSalt,
        cred.createdAt,
        cred.updatedAt,
      ],
    );
  } catch (err) {
    console.error("[user-credentials] postgres upsert failed", err);
  }
}

async function persist(cred: UserCredential): Promise<void> {
  await Promise.all([persistPostgres(cred), persistToFile()]);
}

export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export function generateUserId(email: string): string {
  return `cred_${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
}

export async function getUserCredential(emailRaw: string): Promise<UserCredential | null> {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  await hydrate();
  return mem().data.users[email] ?? null;
}

export async function createUserCredential(
  emailRaw: string,
  passwordRaw: string,
): Promise<{ ok: true; cred: UserCredential } | { ok: false; error: string }> {
  const email = normalizeEmail(emailRaw);
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email address is required" };
  }
  if (!passwordRaw || passwordRaw.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  await hydrate();
  if (mem().data.users[email]) {
    return { ok: false, error: "An account with this email already exists. Please sign in." };
  }

  const salt = generateSalt();
  const hash = hashPassword(passwordRaw, salt);
  const now = new Date().toISOString();
  const cred: UserCredential = {
    email,
    userId: generateUserId(email),
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now,
  };

  mem().data.users[email] = cred;
  await persist(cred);

  return { ok: true, cred };
}

export async function verifyUserPassword(
  emailRaw: string,
  passwordRaw: string,
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const email = normalizeEmail(emailRaw);
  if (!email || !passwordRaw) {
    return { ok: false, error: "Email and password are required" };
  }

  await hydrate();
  const cred = mem().data.users[email];
  if (!cred) {
    return { ok: false, error: "No account found with this email. Please sign up." };
  }

  const computedHash = hashPassword(passwordRaw, cred.passwordSalt);
  try {
    const valid = timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(cred.passwordHash, "hex"),
    );
    if (!valid) {
      return { ok: false, error: "Incorrect password" };
    }
    return { ok: true, userId: cred.userId };
  } catch {
    return { ok: false, error: "Authentication failed" };
  }
}
