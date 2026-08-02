"use client";

export type StudioTab = "configure" | "actions" | "install";

export type SetupStepId = "knowledge" | "connect" | "rent" | "try" | "install";

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

export function SetupGuide({
  agentId,
  isWorkflow,
  rented,
  hasKnowledge,
  toolsConnected,
  triedChat,
  visitedInstall,
  skippedConnect,
  onGoTab,
  onFocusChat,
  onSkipConnect,
  onRent,
}: {
  agentId: string;
  isWorkflow: boolean;
  rented: boolean;
  hasKnowledge: boolean;
  toolsConnected: boolean;
  triedChat: boolean;
  visitedInstall: boolean;
  skippedConnect: boolean;
  onGoTab: (tab: StudioTab) => void;
  onFocusChat: () => void;
  onSkipConnect: () => void;
  onRent: () => void;
}) {
  void agentId;

  const connectDone = toolsConnected || skippedConnect;
  const connectTitle = isWorkflow ? "Connect Calendar / Slack" : "Connect tools";

  const steps: Step[] = [
    {
      id: "knowledge",
      title: "Knowledge",
      detail:
        "Starter pack is enough to run. Add FAQs, hours, or policies when you want it to sound like your business.",
      done: hasKnowledge,
      requirement: "optional",
      requirementLabel: "Optional — starter included",
    },
    {
      id: "connect",
      title: connectTitle,
      detail: isWorkflow
        ? "Not needed to try in sandbox. Required for live calendar writes and Slack handoffs."
        : "Not needed to try in sandbox. Connect only the systems you need before going live.",
      done: connectDone,
      requirement: "live-required",
      requirementLabel: "Optional now · required for live",
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
  const current = steps.find((s) => !s.done) ?? steps[steps.length - 1]!;
  const pct = Math.round((doneCount / steps.length) * 100);
  const minReady = hasKnowledge;
  const liveReady = rented && (!isWorkflow || toolsConnected);

  function continueStep(id: SetupStepId) {
    if (id === "knowledge") {
      onGoTab("configure");
      window.setTimeout(() => {
        document.getElementById("studio-knowledge")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }
    if (id === "connect") {
      onGoTab("actions");
      return;
    }
    if (id === "rent") {
      if (!rented) onRent();
      onGoTab("configure");
      return;
    }
    if (id === "try") {
      onGoTab("configure");
      onFocusChat();
      return;
    }
    if (!rented) {
      onRent();
    }
    onGoTab("install");
  }

  return (
    <div className="panel space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Setup</h2>
          <p className="mt-0.5 max-w-xl text-xs text-[var(--muted)]">
            Minimum to try: starter knowledge. Minimum to go live: activate plan
            {isWorkflow ? " + Calendar / Slack" : " + any tools you need"}. Sandbox is the last check
            before Install.
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

      {/* Horizontal stepper */}
      <ol className="relative grid grid-cols-5 gap-1 sm:gap-2">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[10%] right-[10%] top-4 z-0 hidden h-px bg-[var(--line)] sm:block"
        />
        {steps.map((step, idx) => {
          const active = step.id === current.id;
          return (
            <li key={step.id} className="relative z-10">
              <button
                type="button"
                onClick={() => continueStep(step.id)}
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

      {/* Active step detail */}
      <div
        className={`rounded-xl border px-4 py-3 ${
          current.done
            ? "border-[var(--line)]"
            : "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text)]">
            Step {steps.findIndex((s) => s.id === current.id) + 1}: {current.title}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${requirementClass(current.requirement)}`}
          >
            {current.requirementLabel}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{current.detail}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {doneCount < steps.length ? (
            <>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={() => continueStep(current.id)}
              >
                {current.id === "try"
                  ? "Open sandbox"
                  : current.id === "rent" && !rented
                    ? "Activate plan"
                    : current.id === "install"
                      ? rented
                        ? "Open Install"
                        : "Activate & go live"
                      : `Continue — ${current.title}`}
              </button>
              {current.id === "connect" && !toolsConnected ? (
                <button type="button" className="btn btn-ghost text-xs" onClick={onSkipConnect}>
                  Skip for now — try sandbox
                </button>
              ) : null}
              {current.id === "knowledge" ? (
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => continueStep("connect")}
                >
                  Keep starter pack — next
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-[var(--accent)]">
              Setup complete. Open Install anytime to put the agent on your website or app.
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-[var(--muted)]">
        <span className="font-medium text-[var(--text)]">Minimum path:</span> keep starter knowledge →
        try sandbox → activate plan → Install.
        {isWorkflow ? (
          <>
            {" "}
            <span className="font-medium text-[var(--text)]">For live writes:</span> also connect
            Calendar and Slack.
          </>
        ) : null}
      </p>
    </div>
  );
}

export function rentalStatusLabel(state: string): string {
  if (state === "selected") return "Not rented";
  if (state === "configuring") return "Draft";
  if (state === "rented" || state === "live" || state === "paused") return "Ready";
  return state;
}
