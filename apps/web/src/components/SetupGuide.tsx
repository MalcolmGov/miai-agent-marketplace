"use client";

export type SetupStepId = "knowledge" | "connect" | "rent" | "try" | "install";

export const SETUP_STEPS: SetupStepId[] = [
  "knowledge",
  "connect",
  "rent",
  "try",
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
  rented: boolean;
  triedChat: boolean;
  visitedInstall: boolean;
}): SetupStepId {
  // First visit: always start on Knowledge
  if (!flags.hasKnowledge && !flags.rented && !flags.triedChat && !flags.visitedInstall) {
    return "knowledge";
  }
  if (!flags.hasKnowledge) return "knowledge";
  // Connect tools is optional — never block the path
  if (!flags.rented) return "rent";
  if (!flags.triedChat) return "try";
  if (!(flags.visitedInstall && flags.rented)) return "install";
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
  hasKnowledge,
  toolsConnected,
  triedChat,
  visitedInstall,
  skippedConnect,
  activeStep,
  onStepChange,
  onSkipConnect,
  onRent,
  onConfirmKnowledge,
}: {
  agentId: string;
  isWorkflow: boolean;
  rented: boolean;
  hasKnowledge: boolean;
  toolsConnected: boolean;
  triedChat: boolean;
  visitedInstall: boolean;
  skippedConnect: boolean;
  activeStep: SetupStepId;
  onStepChange: (step: SetupStepId) => void;
  onSkipConnect: () => void;
  onRent: () => void;
  onConfirmKnowledge?: () => void;
}) {
  void agentId;

  const connectDone = toolsConnected || skippedConnect;
  const connectTitle = isWorkflow ? "Connect Calendar / Slack" : "Connect tools";

  const steps: Step[] = [
    {
      id: "knowledge",
      title: "Knowledge",
      detail:
        "Add your business info — services, hours, FAQs, and policies — so answers sound like you. Replace the starter pack with your real content.",
      done: hasKnowledge,
      requirement: "required",
      requirementLabel: "Required — your business content",
    },
    {
      id: "connect",
      title: connectTitle,
      detail: isWorkflow
        ? "Optional. Skip to deploy as a knowledge responder. Connect Calendar / Slack later for live bookings and handoffs."
        : "Optional. Skip to deploy as a knowledge responder. Connect tools later if you need live writes.",
      done: connectDone,
      requirement: "optional",
      requirementLabel: "Optional — knowledge-only is fine",
    },
    {
      id: "rent",
      title: rented ? "Plan active" : "Activate plan",
      detail: rented
        ? "Entitlement is ready — try the agent, then install on your site or app."
        : "Required before Install. Sandbox try still works without this.",
      done: rented,
      requirement: "required",
      requirementLabel: "Required to go live",
    },
    {
      id: "try",
      title: "Try in sandbox",
      detail:
        "Last check before go live — send a real scenario. Free while not rented; no live API writes.",
      done: triedChat,
      requirement: "recommended",
      requirementLabel: "Recommended",
    },
    {
      id: "install",
      title: "Go live",
      detail: rented
        ? "Copy website embed or App link — once installed, you’re running."
        : "Activate a plan first, then copy website embed or App link.",
      done: visitedInstall && rented,
      requirement: "required",
      requirementLabel: "Required",
    },
  ];

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
    if (activeStep === "connect" && !toolsConnected) {
      onSkipConnect();
      return;
    }
    if (activeStep === "rent" && !rented) {
      onRent();
      return;
    }
    if (activeStep === "install" && !rented) {
      onRent();
      return;
    }
    if (nxt) onStepChange(nxt);
  }

  const primaryLabel =
    activeStep === "knowledge"
      ? "Save & continue"
      : activeStep === "rent" && !rented
      ? "Activate plan"
      : activeStep === "install" && !rented
        ? "Activate & go live"
        : activeStep === "try"
          ? "Continue to Go live"
          : activeStep === "install"
            ? "Setup complete"
            : nxt
              ? `Continue — ${steps.find((s) => s.id === nxt)?.title}`
              : "Done";

  return (
    <div className="panel space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Setup</h2>
          <p className="mt-0.5 max-w-xl text-xs text-[var(--muted)]">
            One step at a time. Required: your business knowledge + activate plan. Tools are optional —
            you can go live as a knowledge responder and connect systems later. Sandbox is the last
            check before Install.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-[var(--accent-bright)]">
            {doneCount}/{steps.length} · {pct}%
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            {liveReady ? "Ready for live path" : minReady ? "Sandbox-ready" : "Getting started"}
          </div>
        </div>
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-[var(--bg-elev)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="relative grid grid-cols-5 gap-1 sm:gap-2">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[10%] right-[10%] top-4 z-0 hidden h-px bg-[var(--line)] sm:block"
        />
        {steps.map((step, idx) => {
          const active = step.id === activeStep;
          return (
            <li key={step.id} className="relative z-10">
              <button
                type="button"
                onClick={() => onStepChange(step.id)}
                className="flex w-full flex-col items-center gap-1.5 px-0.5 text-center sm:gap-2 sm:px-1"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                    step.done
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : active
                        ? "bg-[var(--bg-panel)] text-[var(--accent-bright)] ring-2 ring-[var(--accent)]"
                        : "bg-[var(--bg-panel)] text-[var(--muted)] ring-1 ring-[var(--line)]"
                  }`}
                >
                  {step.done ? "✓" : idx + 1}
                </span>
                <span
                  className={`text-[10px] font-semibold leading-tight sm:text-xs ${
                    active || step.done ? "text-[var(--text)]" : "text-[var(--muted)]"
                  }`}
                >
                  {step.title}
                </span>
                <span
                  className={`max-w-full truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none sm:text-[10px] ${requirementClass(step.requirement)}`}
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
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{current.detail}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeStep === "install" && visitedInstall && rented ? (
            <p className="text-xs text-[var(--accent)]">
              Setup complete. Use the embed or App link below anytime.
            </p>
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
                  Skip tools — continue
                </button>
              ) : null}
              {activeStep === "rent" && rented && nxt ? (
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
        activate plan → try sandbox → Install.
        {isWorkflow ? (
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
