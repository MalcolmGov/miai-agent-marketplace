"use client";

import { useState } from "react";

export type SetupStepId = "knowledge" | "connect" | "try" | "tokens" | "install";

export const SETUP_STEPS: SetupStepId[] = [
  "knowledge",
  "try",
  "connect",
  "tokens",
  "install",
];

type Requirement = "required" | "optional" | "recommended" | "live-required";

interface Step {
  id: SetupStepId;
  title: string;
  detail: string;
  done: boolean;
  requirement: Requirement;
  requirementLabel: string;
}

function storageKey(agentId: string, suffix: string) {
  return `miai-setup:${agentId}:${suffix}`;
}

export function readSetupFlag(agentId: string, suffix: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(agentId, suffix)) === "1";
  } catch {
    return false;
  }
}

export function writeSetupFlag(agentId: string, suffix: string) {
  try {
    window.localStorage.setItem(storageKey(agentId, suffix), "1");
  } catch {
    /* ignore quota */
  }
}

export function isSetupStepId(v: string | null | undefined): v is SetupStepId {
  return Boolean(v && (SETUP_STEPS as string[]).includes(v));
}

/** First incomplete step, or install when all done. */
export function resolveSetupStep(flags: {
  hasKnowledge: boolean;
  connectDone: boolean;
  hasTokens: boolean;
  triedChat: boolean;
  visitedInstall: boolean;
}): SetupStepId {
  if (!flags.hasKnowledge && !flags.hasTokens && !flags.triedChat && !flags.visitedInstall) {
    return "knowledge";
  }
  if (!flags.hasKnowledge) return "knowledge";
  // Connect tools is optional — never block the path
  if (!flags.triedChat) return "try";
  // Nudge toward buying tokens (activation itself is free); never hard-block install.
  if (!flags.hasTokens) return "tokens";
  return "install";
}

export function SetupGuide({
  agentId,
  isWorkflow,
  rented,
  hasTokens,
  hasKnowledge,
  toolsConnected,
  triedChat,
  visitedInstall,
  skippedConnect,
  activeStep,
  onStepChange,
  model,
  modelOptions,
  onModelChange,
}: {
  agentId: string;
  isWorkflow: boolean;
  /** Agent is activated (free) — has a workspace record + embed key. Gates going live. */
  rented: boolean;
  /** Workspace has a positive prepaid token balance. */
  hasTokens: boolean;
  hasKnowledge: boolean;
  toolsConnected: boolean;
  triedChat: boolean;
  visitedInstall: boolean;
  skippedConnect: boolean;
  activeStep: SetupStepId;
  onStepChange: (step: SetupStepId) => void;
  /** Inline reasoning-engine control (Copilot-style single panel). */
  model?: string;
  modelOptions?: { id: string; label: string; burn: string }[];
  onModelChange?: (id: string) => void;
}) {
  const isCommerce = /agentic-commerce|shopping|commerce/i.test(agentId);
  const connectDone = toolsConnected || skippedConnect;
  const connectTitle = isCommerce
    ? "Connect Shopify / Stripe"
    : isWorkflow
      ? "Connect Calendar / Slack"
      : "Connect tools";

  const steps: Step[] = [
    {
      id: "knowledge",
      title: "Knowledge",
      detail: isCommerce
        ? "Catalog, shipping tiers, returns & tax policies"
        : "Your business content — services, hours, FAQs, policies",
      done: hasKnowledge,
      requirement: "required",
      requirementLabel: "Required — your business content",
    },
    {
      id: "try",
      title: "Sandbox",
      detail: "Free test on your content — no live writes, no tokens",
      done: triedChat,
      requirement: "recommended",
      requirementLabel: "Recommended",
    },
    {
      id: "connect",
      title: connectTitle,
      detail: isCommerce
        ? "Optional — Shopify / Stripe for live checkout"
        : isWorkflow
          ? "Optional — Calendar / Slack for live bookings"
          : "Optional — connect systems for live writes",
      done: connectDone,
      requirement: "optional",
      requirementLabel: "Optional — knowledge-only is fine",
    },
    {
      id: "tokens",
      title: hasTokens ? "Tokens added" : "Add tokens",
      detail: hasTokens
        ? "Prepaid balance funded"
        : "Pay-as-you-go top-up powers live replies",
      done: hasTokens,
      requirement: "recommended",
      requirementLabel: "Recommended before live",
    },
    {
      id: "install",
      title: visitedInstall && rented ? "Live & activated" : "Go live and activate",
      detail: rented
        ? "Embed key ready — copy the snippet or app link"
        : "Activate free, get your embed key",
      done: visitedInstall && rented,
      requirement: "required",
      requirementLabel: "Required",
    },
  ];

  const [collapsed, setCollapsed] = useState(false);
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const minReady = hasKnowledge;
  const liveReady = rented && hasKnowledge;

  return (
    <div className="panel card-specular-rim space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Agent setup</h2>
            <button
              type="button"
              onClick={() => setCollapsed((v: boolean) => !v)}
              className="text-[10px] font-medium text-[var(--muted)] hover:text-white px-2 py-0.5 rounded border border-[var(--line)] bg-[var(--bg-elev)] transition-colors"
            >
              {collapsed ? "Show details ▼" : "Minimize ▲"}
            </button>
          </div>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            Everything this agent needs — one line each. Click a row to open it below.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[var(--accent-bright)]">
            {doneCount}/{steps.length} · {pct}%
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {liveReady ? "Ready for live path" : minReady ? "Sandbox-ready" : "Getting started"}
          </div>
        </div>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)] shadow-inner"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent-dim)] via-[var(--accent)] to-[var(--accent-bright)] shadow-[0_0_10px_var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {!collapsed ? (
        <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-panel)_60%,transparent)]">
          {/* Model — inline control, Copilot-style: label + one-liner + the control itself. */}
          {model && modelOptions && onModelChange ? (
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-3.5 py-2.5">
              <span aria-hidden className="text-sm">
                🧠
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text)]">Model</p>
                <p className="truncate text-[11px] text-[var(--muted)]">
                  Reasoning engine for live deployments
                </p>
              </div>
              <select
                id="studio-model"
                aria-label="Reasoning engine"
                value={model}
                onChange={(e) => onModelChange(e.target.value)}
                className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-2 py-1.5 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              >
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} · {m.burn}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {steps.map((step, idx) => {
            const active = step.id === activeStep;
            const status =
              step.id === "knowledge"
                ? step.done
                  ? "Ready"
                  : "Required"
                : step.id === "try"
                  ? step.done
                    ? "Tested"
                    : "Recommended"
                  : step.id === "connect"
                    ? skippedConnect
                      ? "Skipped"
                      : step.done
                        ? "Connected"
                        : "Optional"
                    : step.id === "tokens"
                      ? step.done
                        ? "Funded"
                        : "Add"
                      : step.done
                        ? "Live"
                        : "Required";
            const action =
              step.id === "knowledge"
                ? "Edit"
                : step.id === "try"
                  ? "Try"
                  : step.id === "connect"
                    ? "Connect"
                    : step.id === "tokens"
                      ? "Add tokens"
                      : "Install";
            const tone = step.done
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : step.requirement === "required" || step.requirement === "live-required"
                ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent-bright)]"
                : "border-[var(--line)] bg-[var(--bg-elev)] text-[var(--muted)]";
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-3 border-b border-[var(--line)] px-3.5 py-2.5 text-left transition-colors last:border-b-0 ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.done
                      ? "bg-gradient-to-br from-[var(--accent-bright)] to-[var(--accent)] text-[var(--accent-ink)]"
                      : active
                        ? "bg-[var(--bg-panel)] text-[var(--accent-bright)] ring-1 ring-[var(--accent)]"
                        : "bg-[var(--bg-panel)] text-[var(--muted)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {step.done ? "✓" : idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-semibold ${active || step.done ? "text-[var(--text)]" : "text-[var(--text)]/80"}`}>
                      {step.title}
                    </span>
                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none ${tone}`}>
                      {status}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                    {step.detail}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-[var(--accent-bright)]">
                  {action} →
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {visitedInstall && rented ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-[var(--muted)]">
            <span aria-hidden>✅</span>{" "}
            {"You're live — nothing else is required."}
          </p>
          <a href="/my-agents" className="btn btn-ghost text-xs ml-auto">
            View My agents →
          </a>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Use Studio setup steps; kept for any leftover imports */
export type StudioTab = "configure" | "actions" | "install";

export function rentalStatusLabel(state: string): string {
  if (state === "selected") return "Not rented";
  if (state === "configuring") return "Draft";
  if (state === "rented" || state === "live" || state === "paused") return "Ready";
  return state;
}
