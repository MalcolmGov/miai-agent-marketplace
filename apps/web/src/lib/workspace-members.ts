import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { WORKSPACE_ID } from "@/lib/constants";
import { ensureMigrations } from "@/lib/migrate";
import { databaseUrl, query } from "@/lib/pg";
import type { WorkspaceRole } from "@/lib/security";

export type MemberStatus = "active" | "pending";

export type WorkspaceMember = {
  userId: string;
  email: string;
  displayName?: string;
  role: WorkspaceRole;
  status: MemberStatus;
  invitedAt: string;
  invitedBy?: string;
  inviteToken?: string;
};

type StoreFile = {
  workspaces: Record<string, WorkspaceMember[]>;
};

function storePath(): string {
  if (process.env.WORKSPACE_MEMBERS_PATH) return path.resolve(process.env.WORKSPACE_MEMBERS_PATH);
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR, "workspace-members.json");
  return path.resolve(process.cwd(), "../../data/workspace-members.json");
}

const g = globalThis as typeof globalThis & {
  __miaiWorkspaceMembers?: {
    data: StoreFile;
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function mem() {
  if (!g.__miaiWorkspaceMembers) {
    g.__miaiWorkspaceMembers = {
      data: { workspaces: {} },
      hydrated: false,
    };
  }
  return g.__miaiWorkspaceMembers;
}

async function hydrateFromPostgres(): Promise<boolean> {
  if (!databaseUrl()) return false;
  try {
    await ensureMigrations();
    const res = await query<{ workspace_id: string; payload: WorkspaceMember }>(
      "SELECT workspace_id, payload FROM miai_workspace_members",
    );
    const workspaces: Record<string, WorkspaceMember[]> = {};
    for (const row of res.rows) {
      const list = workspaces[row.workspace_id] ?? [];
      list.push(row.payload);
      workspaces[row.workspace_id] = list;
    }
    mem().data = { workspaces };
    return true;
  } catch (err) {
    console.error("[workspace-members] postgres hydrate failed", err);
    return false;
  }
}

async function hydrateFromFile(): Promise<void> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    mem().data = {
      workspaces:
        parsed?.workspaces && typeof parsed.workspaces === "object" ? parsed.workspaces : {},
    };
  } catch {
    mem().data = { workspaces: {} };
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

async function upsertMemberPostgres(workspaceId: string, member: WorkspaceMember): Promise<void> {
  if (!databaseUrl()) return;
  try {
    await query(
      `INSERT INTO miai_workspace_members (workspace_id, user_id, payload, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [workspaceId, member.userId, JSON.stringify(member)],
    );
  } catch (err) {
    console.error("[workspace-members] postgres upsert failed", err);
  }
}

async function deleteMemberPostgres(workspaceId: string, userId: string): Promise<void> {
  if (!databaseUrl()) return;
  try {
    await query("DELETE FROM miai_workspace_members WHERE workspace_id = $1 AND user_id = $2", [
      workspaceId,
      userId,
    ]);
  } catch (err) {
    console.error("[workspace-members] postgres delete failed", err);
  }
}

async function persist(): Promise<void> {
  await persistToFile();
}

function seedOwner(_workspaceId: string): WorkspaceMember {
  void _workspaceId;
  return {
    userId: "demo-user",
    email: "owner@demo.myinstantai.com",
    displayName: "Demo Owner",
    role: "owner",
    status: "active",
    invitedAt: new Date().toISOString(),
  };
}

async function ensureSeeded(workspaceId: string): Promise<WorkspaceMember[]> {
  await hydrate();
  const ws = mem().data.workspaces;
  if (!ws[workspaceId]?.length) {
    ws[workspaceId] = [seedOwner(workspaceId)];
    // Also seed default demo workspace if calling another id first
    if (workspaceId !== WORKSPACE_ID && !ws[WORKSPACE_ID]?.length) {
      ws[WORKSPACE_ID] = [seedOwner(WORKSPACE_ID)];
    }
    for (const [wid, members] of Object.entries(ws)) {
      for (const member of members) {
        await upsertMemberPostgres(wid, member);
      }
    }
    await persist();
  }
  return ws[workspaceId]!;
}

export async function listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const rows = await ensureSeeded(workspaceId);
  return [...rows].sort((a, b) => a.email.localeCompare(b.email));
}

export async function getMember(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMember | undefined> {
  const rows = await ensureSeeded(workspaceId);
  return rows.find((m) => m.userId === userId);
}

export async function findMemberByEmail(
  workspaceId: string,
  email: string,
): Promise<WorkspaceMember | undefined> {
  const rows = await ensureSeeded(workspaceId);
  const needle = email.trim().toLowerCase();
  return rows.find((m) => m.email.toLowerCase() === needle);
}

export async function inviteMember(input: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
}): Promise<WorkspaceMember> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Valid email required");
  if (input.role === "owner") throw new Error("Cannot invite as owner — promote an existing member");

  const rows = await ensureSeeded(input.workspaceId);
  const existing = rows.find((m) => m.email.toLowerCase() === email);
  if (existing) throw new Error("Member already exists");

  const inviteToken = `inv_${randomBytes(12).toString("hex")}`;
  const member: WorkspaceMember = {
    userId: `pending_${randomBytes(6).toString("hex")}`,
    email,
    role: input.role,
    status: "pending",
    invitedAt: new Date().toISOString(),
    invitedBy: input.invitedBy,
    inviteToken,
  };
  rows.push(member);
  await upsertMemberPostgres(input.workspaceId, member);
  await persist();
  return member;
}

export async function updateMemberRole(input: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}): Promise<WorkspaceMember> {
  const rows = await ensureSeeded(input.workspaceId);
  const member = rows.find((m) => m.userId === input.userId);
  if (!member) throw new Error("Member not found");

  if (member.role === "owner" && input.role !== "owner") {
    const owners = rows.filter((m) => m.role === "owner" && m.status === "active");
    if (owners.length <= 1) throw new Error("Cannot demote the last owner");
  }

  member.role = input.role;
  if (member.status === "pending" && input.role) {
    /* keep pending until accept */
  }
  await upsertMemberPostgres(input.workspaceId, member);
  await persist();
  return member;
}

export async function removeMember(input: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  const rows = await ensureSeeded(input.workspaceId);
  const member = rows.find((m) => m.userId === input.userId);
  if (!member) throw new Error("Member not found");
  if (member.role === "owner") {
    const owners = rows.filter((m) => m.role === "owner" && m.status === "active");
    if (owners.length <= 1) throw new Error("Cannot remove the last owner");
  }
  mem().data.workspaces[input.workspaceId] = rows.filter((m) => m.userId !== input.userId);
  await deleteMemberPostgres(input.workspaceId, input.userId);
  await persist();
}

/** Resolve role from member store when an active member matches userId or email-like id. */
export async function roleFromMembers(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceRole | null> {
  const rows = await ensureSeeded(workspaceId);
  const hit = rows.find(
    (m) => m.status === "active" && (m.userId === userId || m.email === userId),
  );
  return hit?.role ?? null;
}
