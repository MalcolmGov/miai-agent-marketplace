"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  intentToFamilyHint,
  type ChecklistStepId,
  type WorkspaceOnboarding,
} from "@/lib/workspace-onboarding-types";

type Me = {
  workspaceId: string;
  roles: string[];
  mode: string;
  isOperator: boolean;
  product: string | null;
};

const STEPS: Array<{
  id: ChecklistStepId;
  title: string;
  body: string;
  href: (p: WorkspaceOnboarding) => string;
}> = [
  {
    id: "market",
    title: "Confirm your market",
    body: "Filter the catalogue to your region.",
    href: (p) => `/?market=${p.market}#catalogue`,
  },
  {
    id: "browse",
    title: "Open a recommended agent",
    body: "Start from a family that matches your intent.",
    href: (p) => {
      const family = intentToFamilyHint(p.intent);
      return `/?q=${encodeURIComponent(family.replace(/-/g, " "))}#catalogue`;
    },
  },
  {
    id: "try",
    title: "Try chat in Studio",
    body: "Free sandbox — ask a grounded question.",
    href: () => "/agents/us-customer-support?step=try",
  },
  {
    id: "rent",
    title: "Rent when ready",
    body: "Activate entitlement for live embed / app.",
    href: () => "/agents/us-customer-support",
  },
  {
    id: "install",
    title: "Install (optional)",
    body: "Copy agent.js or App channel URL.",
    href: () => "/agents/us-customer-support?step=install",
  },
];

export function OnboardingChecklist() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<WorkspaceOnboarding | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const forceShow = searchParams.get("onboarding") === "1";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding");
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setMe(data.me ?? null);
      setProfile(data.profile ?? null);
      const show =
        forceShow ||
        (data.profile?.wizardCompleted && !data.profile?.checklistDismissed);
      setOpen(Boolean(show));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [forceShow]);

  useEffect(() => {
    if (pathname !== "/") {
      setOpen(false);
      return;
    }
    void refresh();
  }, [pathname, refresh]);

  async function patch(body: Record<string, unknown>) {
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = await res.json();
    setProfile(data.profile);
    if (data.profile?.checklistDismissed) setOpen(false);
  }

  async function mark(step: ChecklistStepId) {
    await patch({ checklist: { [step]: true } });
  }

  async function dismiss() {
    await patch({ checklistDismissed: true });
    setOpen(false);
  }

  if (loading || !profile || pathname !== "/") return null;

  const doneCount = STEPS.filter((s) => profile.checklist[s.id]).length;

  if (!open) {
    if (!profile.wizardCompleted) return null;
    return (
      <button
        type="button"
        className="btn btn-primary fixed bottom-4 right-4 z-40 text-xs shadow-lg"
        data-testid="onboarding-checklist-reopen"
        onClick={() => {
          setOpen(true);
          void patch({ checklistDismissed: false });
        }}
      >
        Setup guide
      </button>
    );
  }

  return (
    <aside
      className="onboarding-checklist fixed bottom-4 right-4 z-40 w-[min(100%-2rem,22rem)] rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] p-4 shadow-lg"
      data-testid="onboarding-checklist"
      aria-label="First-run checklist"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-bright)]">
            Get started
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            {profile.companyName}
          </h2>
          <p className="text-xs text-[var(--muted)]">
            {doneCount}/{STEPS.length} complete
            {me?.workspaceId ? ` · ${me.workspaceId}` : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost !px-2 !py-1 text-xs"
          onClick={() => void dismiss()}
          data-testid="onboarding-checklist-dismiss"
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {STEPS.map((step) => {
          const done = profile.checklist[step.id];
          return (
            <li key={step.id}>
              <Link
                href={step.href(profile)}
                onClick={() => void mark(step.id)}
                className={`block rounded-lg border px-3 py-2 text-left text-sm transition hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] ${
                  done
                    ? "border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    : "border-[var(--line)] bg-[var(--bg-elev)]"
                }`}
                data-testid={`onboarding-step-${step.id}`}
              >
                <span className="font-medium text-[var(--text)]">
                  {done ? "✓ " : `${STEPS.findIndex((s) => s.id === step.id) + 1}. `}
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{step.body}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
