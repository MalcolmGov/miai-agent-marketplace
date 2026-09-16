"use client";

import { useState } from "react";

export type SetupStepId = "knowledge" | "connect" | "try" | "tokens" | "install";

export const SETUP_STEPS: SetupStepId[] = [
  "knowledge",
  "connect",
  "try",
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

function requirementClass(r: Requirement): string {
  if (r === "required") {
    return "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent-bright)]";
  }
  if (r === "live-required") {
    return "border-[color-mix(in_srgb,#f0b429_40%,transparent)] bg-[color-mix(in_srgb,#f0b429_10%,transparent)] text-[#e6c35c]";
  }
  if (r === "recommended") {
    return "border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--text)]";
  }
  return "border-[var(--line)] bg-transparent text-[var(--muted)]";
}

function nextAfter(id: SetupStepId): SetupStepId | null {
  const i = SETUP_STEPS.indexOf(id);
  if (i < 0 || i >= SETUP_STEPS.length - 1) return null;
  return SETUP_STEPS[i + 1]!;
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
  onSkipConnect,
  onConfirmKnowledge,
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
  onSkipConnect: () => void;
  onConfirmKnowledge?: () => void;
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
        ? "Add your merchant catalog, shipping tiers, returns & tax policies — so shoppers get accurate quotes and checkouts."
        : "Add your business info — services, hours, FAQs, and policies — so answers sound like you. Replace the starter pack with your real content.",
      done: hasKnowledge,
      requirement: "required",
      requirementLabel: "Required — your business content",
    },
    {
      id: "connect",
      title: connectTitle,
      detail: isCommerce
        ? "Optional. Skip to try the agent on catalog knowledge alone. Connect Shopify / Stripe later for live inventory, orders, and checkout execution."
        : isWorkflow
          ? "Optional. Skip to try the agent on knowledge alone. Connect Calendar / Slack later for live bookings and handoffs."
          : "Optional. Skip to try the agent on knowledge alone. Connect tools later if you need live writes.",
      done: connectDone,
      requirement: "optional",
      requirementLabel: "Optional — knowledge-only is fine",
    },
    {
      id: "try",
      title: "Sandbox",
      detail:
        "Try a real customer scenario first. Sandbox is free — no live API writes, no tokens spent.",
      done: triedChat,
      requirement: "recommended",
      requirementLabel: "Recommended",
    },
    {
      id: "tokens",
      title: hasTokens ? "Tokens added" : "Add tokens",
      detail: hasTokens
        ? "Your prepaid balance is funded — continue to go live and activate."
        : "No subscription. Pick a prepaid token package (Paystack) so your live agent can reply. Activation is free.",
      done: hasTokens,
      requirement: "recommended",
      requirementLabel: "Recommended before live",
    },
    {
      id: "install",
      title: visitedInstall && rented ? "Live & activated" : "Go live and activate",
      detail: rented
        ? "You're live — nothing else is required. Preview the widget below anytime; copy the website snippet only if you want it embedded on your own site."
        : "Activate this agent (free) to get your embed key, then copy the website embed or App link.",
      done: visitedInstall && rented,
      requirement: "required",
      requirementLabel: "Required",
    },
  ];

  const [collapsed, setCollapsed] = useState(false);
  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => s.id === activeStep) ?? steps[0]!;
  const pct = Math.round((doneCount / steps.length) * 100);
  const minReady = hasKnowledge;
  const liveReady = rented && hasKnowledge;
  const nxt = nextAfter(activeStep);

  function primaryAction() {
    if (activeStep === "knowledge") {
      onConfirmKnowledge?.();
      if (nxt) onStepChange(nxt);
      return;
    }
    if (activeStep === "connect") {
      if (toolsConnected) {
        if (nxt) onStepChange(nxt);
      } else {
        document.getElementById("studio-actions")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    if (activeStep === "tokens") {
      document.getElementById("token-topup")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (activeStep === "install" && !rented) {
      onStepChange("tokens");
      return;
    }
    if (nxt) onStepChange(nxt);
  }

  const primaryLabel =
    activeStep === "knowledge"
      ? "Save & continue"
      : activeStep === "connect"
        ? toolsConnected
          ? "Continue — Sandbox"
          : "Connect Accounts Below ↓"
        : activeStep === "tokens"
          ? "Add tokens"
          : activeStep === "install" && !rented
            ? "Activate to go live"
            : activeStep === "try"
              ? "Continue — Add tokens"
              : activeStep === "install"
                ? "Setup complete"
                : nxt
                  ? `Continue — ${steps.find((s) => s.id === nxt)?.title}`
                  : "Done";

  return (
    <div className="panel card-specular-rim space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">Setup Guide</h2>
            <button
              type="button"
              onClick={() => setCollapsed((v: boolean) => !v)}
              className="text-[10px] font-medium text-[var(--muted)] hover:text-white px-2 py-0.5 rounded border border-[var(--line)] bg-[var(--bg-elev)] transition-colors"
            >
              {collapsed ? "Show details ▼" : "Minimize ▲"}
            </button>
          </div>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            One step at a time. Add knowledge, optionally connect tools, try sandbox, then add
            prepaid tokens before you go live and activate.
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

      <ol className="relative grid grid-cols-5 gap-1 sm:gap-2">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[10%] right-[10%] top-4 z-0 hidden h-0.5 bg-gradient-to-r from-[var(--line)] via-[color-mix(in_srgb,var(--accent)_50%,var(--line))] to-[var(--line)] sm:block"
        />
        {steps.map((step, idx) => {
          const active = step.id === activeStep;
          return (
            <li key={step.id} className="relative z-10">
              <button
                type="button"
                onClick={() => onStepChange(step.id)}
                className="flex w-full min-h-[44px] flex-col items-center gap-1.5 px-0.5 text-center sm:gap-2 sm:px-1 active:scale-[0.96] transition-transform"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                    step.done
                      ? "bg-gradient-to-br from-[var(--accent-bright)] to-[var(--accent)] text-[var(--accent-ink)] shadow-[0_0_12px_-2px_var(--accent)]"
                      : active
                        ? "bg-[var(--bg-panel)] text-[var(--accent-bright)] ring-2 ring-[var(--accent)] shadow-[0_0_16px_rgba(61,214,198,0.7)]"
                        : "bg-[var(--bg-panel)] text-[var(--muted)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {step.done ? "✓" : idx + 1}
                </span>
                <span
                  className={`setup-step-label text-[10px] font-semibold leading-tight sm:text-xs ${
                    active || step.done ? "text-[var(--text)]" : "text-[var(--muted)]"
                  }`}
                >
                  {step.title}
                </span>
                <span
                  className={`setup-step-req max-w-full truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none sm:text-[10px] ${requirementClass(step.requirement)}`}
                >
                  {step.requirement === "optional"
                    ? "Optional"
                    : step.requirement === "recommended"
                      ? "Recommended"
                      : step.requirement === "live-required"
                        ? "For live"
                        : "Required"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {!collapsed ? (
        <>
          <div
            className={`rounded-xl border px-4 py-3 ${
              current.done && activeStep !== current.id
                ? "border-[var(--line)]"
                : "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">
                Step {SETUP_STEPS.indexOf(activeStep) + 1}: {current.title}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${requirementClass(current.requirement)}`}
              >
                {current.requirementLabel}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">
              {activeStep === "connect" && !toolsConnected
                ? isCommerce
                  ? "Authenticate your merchant tools below (Shopify for catalog/inventory, Stripe for checkout execution) to enable live actions, or skip to test in Sandbox first."
                  : "Authenticate your agent's external tools below (Google Calendar, HubSpot, Slack, WhatsApp, etc.) to enable live actions, or skip to test in Sandbox first."
                : current.detail}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {activeStep === "install" && visitedInstall && rented ? (
                <div className="w-full space-y-2.5 rounded-xl border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-4 py-3.5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-bright)]">
                    <span aria-hidden>✅</span> {"You're live — nothing else is required."}
                  </p>
                  <p className="text-xs leading-relaxed text-[var(--muted)]">
                    This agent is activated and ready to chat. Your prepaid tokens meter usage
                    automatically:
                  </p>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-[var(--text)]">
                    <li>
                      <span className="font-semibold">Preview it now:</span> hit “Preview Floating
                      Widget” below, or open the App link — no setup needed.
                    </li>
                    <li>
                      <span className="font-semibold">Embedding on your own website? (optional):</span>{" "}
                      copy the snippet below and paste it before the closing {"</body>"} tag.
                    </li>
                    <li>
                      <span className="font-semibold">Not embedding anywhere?</span>{" "}
                      {"You're done — find this agent under “My agents” anytime."}
                    </li>
                  </ul>
                  <a href="/my-agents" className="btn btn-primary inline-flex text-xs">
                    Done — view My agents →
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-primary text-xs"
                    onClick={primaryAction}
                    disabled={activeStep === "install" && rented && visitedInstall}
                  >
                    {primaryLabel}
                  </button>
                  {activeStep === "connect" && !toolsConnected ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={onSkipConnect}>
                      Skip for now — Test in Sandbox →
                    </button>
                  ) : null}
                  {activeStep === "tokens" && nxt ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => onStepChange(nxt)}
                    >
                      Continue — {steps.find((s) => s.id === nxt)?.title}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <p className="text-[11px] text-[var(--muted)]">
            <span className="font-medium text-[var(--text)]">Minimum path:</span> add your knowledge →
            try sandbox → add tokens → go live and activate.
            {isCommerce ? (
              <>
                {" "}
                <span className="font-medium text-[var(--text)]">Optional later:</span> Shopify / Stripe
                for live catalog search, inventory, and tokenized checkout.
              </>
            ) : isWorkflow ? (
              <>
                {" "}
                <span className="font-medium text-[var(--text)]">Optional later:</span> Calendar / Slack
                for live bookings and handoffs.
              </>
            ) : (
              <>
                {" "}
                <span className="font-medium text-[var(--text)]">Optional later:</span> connect tools for
                live actions.
              </>
            )}
          </p>
        </>
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
