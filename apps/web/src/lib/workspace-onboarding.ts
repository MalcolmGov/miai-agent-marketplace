import { promises as fs } from "node:fs";
import path from "node:path";
import {
  EMPTY_CHECKLIST,
  type OnboardingIntent,
  type OnboardingMarket,
  type WorkspaceOnboarding,
} from "@/lib/workspace-onboarding-types";

export type {
  ChecklistState,
  ChecklistStepId,
  OnboardingIntent,
  OnboardingMarket,
  WorkspaceOnboarding,
} from "@/lib/workspace-onboarding-types";
export { EMPTY_CHECKLIST, intentToFamilyHint } from "@/lib/workspace-onboarding-types";

function storePath(): string {
  if (process.env.WORKSPACE_ONBOARDING_PATH) {
    return path.resolve(process.env.WORKSPACE_ONBOARDING_PATH);
  }
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR, "workspace-onboarding.json");
  }
  return path.resolve(process.cwd(), "../../data/workspace-onboarding.json");
}

const g = globalThis as typeof globalThis & {
  __miaiWorkspaceOnboarding?: {
    rows: WorkspaceOnboarding[];
    hydrated?: boolean;
    hydrating?: Promise<void>;
  };
};

function mem() {
  if (!g.__miaiWorkspaceOnboarding) {
    g.__miaiWorkspaceOnboarding = { rows: [], hydrated: false };
  }
  return g.__miaiWorkspaceOnboarding;
}

async function hydrateFromFile(): Promise<void> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const data = JSON.parse(raw) as WorkspaceOnboarding[];
    mem().rows = Array.isArray(data) ? data : [];
  } catch {
    mem().rows = [];
  }
}

async function hydrate(): Promise<void> {
  const s = mem();
  if (s.hydrated) return;
  if (s.hydrating) return s.hydrating;
  s.hydrating = (async () => {
    await hydrateFromFile();
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

export async function getWorkspaceOnboarding(
  workspaceId: string,
): Promise<WorkspaceOnboarding | null> {
  await hydrate();
  return mem().rows.find((r) => r.workspaceId === workspaceId) ?? null;
}

export async function upsertWorkspaceOnboarding(
  workspaceId: string,
  patch: Partial<
    Omit<WorkspaceOnboarding, "workspaceId" | "createdAt" | "updatedAt" | "product">
  > & {
    companyName?: string;
    market?: OnboardingMarket;
    industry?: string;
    companySize?: string;
    intent?: OnboardingIntent;
  },
): Promise<WorkspaceOnboarding> {
  await hydrate();
  const now = new Date().toISOString();
  const existing = mem().rows.find((r) => r.workspaceId === workspaceId);
  if (!existing) {
    const row: WorkspaceOnboarding = {
      workspaceId,
      companyName: (patch.companyName ?? "").trim() || "My business",
      market: patch.market ?? "us",
      industry: (patch.industry ?? "").trim() || "General",
      companySize: (patch.companySize ?? "").trim() || "1-10",
      intent: patch.intent ?? "customer-support",
      contactEmail: patch.contactEmail?.trim() || undefined,
      product: "agents",
      wizardCompleted: patch.wizardCompleted ?? false,
      checklist: { ...EMPTY_CHECKLIST, ...(patch.checklist ?? {}) },
      checklistDismissed: patch.checklistDismissed ?? false,
      completedAt: patch.completedAt,
      createdAt: now,
      updatedAt: now,
    };
    mem().rows.unshift(row);
    await persist();
    return row;
  }

  const row: WorkspaceOnboarding = {
    ...existing,
    companyName: patch.companyName !== undefined ? patch.companyName.trim() : existing.companyName,
    market: patch.market ?? existing.market,
    industry: patch.industry !== undefined ? patch.industry.trim() : existing.industry,
    companySize:
      patch.companySize !== undefined ? patch.companySize.trim() : existing.companySize,
    intent: patch.intent ?? existing.intent,
    contactEmail:
      patch.contactEmail !== undefined
        ? patch.contactEmail.trim() || undefined
        : existing.contactEmail,
    wizardCompleted: patch.wizardCompleted ?? existing.wizardCompleted,
    checklist: patch.checklist
      ? { ...EMPTY_CHECKLIST, ...existing.checklist, ...patch.checklist }
      : existing.checklist,
    checklistDismissed: patch.checklistDismissed ?? existing.checklistDismissed,
    completedAt: patch.completedAt ?? existing.completedAt,
    updatedAt: now,
  };
  mem().rows = mem().rows.map((r) => (r.workspaceId === workspaceId ? row : r));
  await persist();
  return row;
}
