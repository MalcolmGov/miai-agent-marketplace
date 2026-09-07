"use client";

import { useState } from "react";
import type { SetupStepId } from "./SetupGuide";

export function QuickstartRoadmap({
  agentName,
  activeStep,
  onStepChange,
  toolsConnected,
  connectedCount,
  triedChat,
  visitedInstall,
}: {
  agentName: string;
  activeStep: SetupStepId;
  onStepChange: (step: SetupStepId) => void;
  toolsConnected: boolean;
  connectedCount: number;
  triedChat: boolean;
  visitedInstall: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    {
      id: "knowledge" as SetupStepId,
      title: "1. Persona & Knowledge",
      subtitle: "System prompt, guidelines, and model engine",
      done: true,
      actionLabel: "View Persona",
    },
    {
      id: "connect" as SetupStepId,
      title: "2. Connect External Accounts",
      subtitle: toolsConnected
        ? `${connectedCount} App${connectedCount === 1 ? "" : "s"} Connected & Verified`
        : "Authorize Google Calendar, HubSpot, WhatsApp, or Slack",
      done: toolsConnected,
      actionLabel: toolsConnected ? "Manage Apps" : "Connect Apps →",
    },
    {
      id: "try" as SetupStepId,
      title: "3. Test Drive in Sandbox",
      subtitle: triedChat
        ? "Evaluation completed with sample prompts"
        : "Try realistic prompts and inspect tool execution",
      done: triedChat,
      actionLabel: triedChat ? "Re-test Agent" : "Test in Sandbox →",
    },
    {
      id: "install" as SetupStepId,
      title: "4. Add to Your Website",
      subtitle: visitedInstall
        ? "Embed snippet viewed & website script ready"
        : "Copy 1-line script for HTML, WordPress, Shopify, or Webflow",
      done: visitedInstall,
      actionLabel: visitedInstall ? "View Embed" : "Get Embed Code →",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isAllComplete = completedCount === steps.length;

  return (
    <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line-strong)] bg-gradient-to-b from-[var(--bg-elev)] to-[var(--bg-panel)] p-4 sm:p-5 shadow-card transition-all">
      <div className="card-specular-rim" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-ink)] text-sm shadow-glow-sm">
            {isAllComplete ? "🎉" : "🚀"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {isAllComplete
                  ? `Ready for Live Customers!`
                  : `Launch Roadmap: ${agentName}`}
              </h2>
              <span className="chip chip-live !text-[10px] !py-0.5">
                {completedCount}/{steps.length} Steps Complete
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {isAllComplete
                ? "Your agent is fully provisioned, tested, and ready to engage website visitors."
                : "Complete these 4 self-serve steps to configure, test, and launch your agent in minutes."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-[11px] font-medium text-[var(--muted)] hover:text-white px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg-panel)] transition-colors"
        >
          {collapsed ? "Show Roadmap ▼" : "Minimize ▲"}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
          <span>Overall Readiness</span>
          <span className={isAllComplete ? "text-emerald-400 font-bold" : "text-[var(--accent-bright)] font-bold"}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAllComplete
                ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-[var(--accent-dim)] via-[var(--accent)] to-[var(--accent-bright)] shadow-[0_0_12px_var(--accent)]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      {!collapsed ? (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const isCurrent = activeStep === step.id;
            return (
              <div
                key={step.id}
                className={`relative flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                  isCurrent
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-panel))] shadow-glow-sm"
                    : step.done
                      ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                      : "border-[var(--line)] bg-[var(--bg-panel)]/50 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-white truncate">
                      {step.title}
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        step.done
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-white/10 text-slate-400 border border-white/10"
                      }`}
                    >
                      {step.done ? "✓" : "○"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)] line-clamp-2">
                    {step.subtitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => onStepChange(step.id)}
                    className={`w-full rounded-lg py-1.5 px-2 text-center text-[11px] font-semibold transition-all ${
                      isCurrent
                        ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                        : step.done
                          ? "bg-white/10 text-slate-300 hover:bg-white/15"
                          : "btn-primary !text-[11px] !py-1.5 shadow-glow-sm"
                    }`}
                  >
                    {step.actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5 pt-2.5 border-t border-[var(--line)]">
          {steps.map((step) => {
            const isCurrent = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                    : step.done
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/50"
                      : "border border-[var(--line)] bg-[var(--bg-panel)] text-[var(--muted)] hover:text-white hover:border-white/20"
                }`}
              >
                <span>{step.done ? "✓" : "○"}</span>
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
