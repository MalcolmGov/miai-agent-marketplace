"use client";

export type StudioTab = "configure" | "actions" | "install";

export type SetupStepId = "rent" | "knowledge" | "connect" | "try" | "install";

interface Step {
  id: SetupStepId;
  title: string;
  detail: string;
  done: boolean;
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
  const steps: Step[] = [
    {
      id: "rent",
      title: "Rent this agent",
      detail: "Create your workspace entitlement so you can configure and chat.",
      done: rented,
    },
    {
      id: "knowledge",
      title: "Add your knowledge",
      detail: "Paste FAQs, hours, or policies — or keep the starter pack and continue.",
      done: hasKnowledge,
    },
    {
      id: "connect",
      title: isWorkflow ? "Connect Calendar / Slack" : "Connect tools (optional)",
      detail: isWorkflow
        ? "Needed for live writes. Sandbox still works without this."
        : "Optional for live Actions. You can try the agent in sandbox first.",
      done: connectDone,
    },
    {
      id: "try",
      title: "Try a prompt",
      detail: "Send a message in chat — workflow agents will propose a plan first.",
      done: triedChat,
    },
    {
      id: "install",
      title: "Go live",
      detail: "Website code or App link — copy once, you’re running.",
      done: visitedInstall,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done) ?? steps[steps.length - 1]!;
  const pct = Math.round((doneCount / steps.length) * 100);

  function continueStep(id: SetupStepId) {
    if (id === "rent") {
      onRent();
      onGoTab("configure");
      return;
    }
    if (id === "knowledge") {
      onGoTab("configure");
      return;
    }
    if (id === "connect") {
      onGoTab("actions");
      return;
    }
    if (id === "try") {
      onFocusChat();
      return;
    }
    onGoTab("install");
  }

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Setup guide</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Step {Math.min(doneCount + 1, steps.length)} of {steps.length}
            {doneCount === steps.length ? " — you’re ready" : ""}
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--accent-bright)]">{pct}%</span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev)]"
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

      <ol className="space-y-2">
        {steps.map((step, idx) => {
          const active = step.id === current.id && !step.done;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => continueStep(step.id)}
                className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    step.done
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : active
                        ? "bg-[var(--bg-elev)] text-[var(--accent-bright)] ring-1 ring-[var(--accent)]"
                        : "bg-[var(--bg-elev)] text-[var(--muted)]"
                  }`}
                >
                  {step.done ? "✓" : idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--text)]">{step.title}</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">{step.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {doneCount < steps.length ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary text-xs"
            onClick={() => continueStep(current.id)}
          >
            Continue — {current.title}
          </button>
          {current.id === "connect" && !connectDone ? (
            <button type="button" className="btn btn-ghost text-xs" onClick={onSkipConnect}>
              Skip for sandbox
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-[var(--accent)]">
          Setup complete. Open Install to put the agent on your website or mobile app.
        </p>
      )}
    </div>
  );
}

export function rentalStatusLabel(state: string): string {
  if (state === "selected") return "Not rented";
  if (state === "configuring") return "Draft";
  if (state === "rented" || state === "live" || state === "paused") return "Ready";
  return state;
}
