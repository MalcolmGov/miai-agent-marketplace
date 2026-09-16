"use client";

import { useEffect, useRef } from "react";

/**
 * Destructive-action confirmation for the fleet page — replaces the browser's `window.confirm`
 * (which can't be styled, states the consequence in one run-on line, and exposes the raw host name).
 *
 * Design intent:
 * - keep the context — the agent's name is in the question, not in a generic "Are you sure?";
 * - spell out exactly what stops working, in the order a site owner cares about;
 * - point at the reversible alternative (Disable) instead of a dead end;
 * - survive failure: an API error appears inside the dialog and the agent is not touched;
 * - safe by default: focus starts on Cancel, Escape cancels, focus returns to the trigger.
 */
export function DeleteAgentDialog({
  open,
  agentName,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  agentName: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Cancel is the safe default — a stray Enter must not delete anything.
    const timer = requestAnimationFrame(() => cancelRef.current?.focus());

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-agent-title"
      aria-describedby="delete-agent-desc"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="fixed inset-0 cursor-default bg-black/75 backdrop-blur-md"
        onClick={busy ? undefined : onCancel}
      />
      <div
        ref={dialogRef}
        className="panel card-specular-rim relative z-10 w-full max-w-md rounded-t-3xl border border-rose-500/25 bg-[var(--bg-panel)]/95 p-5 shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.18)] backdrop-blur-2xl rise sm:rounded-2xl sm:p-6 max-h-[92dvh] overflow-y-auto"
      >
        <div className="card-specular-rim" />
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20 sm:hidden" />

        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-lg text-rose-300"
          >
            ⚠
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-agent-title" className="text-base font-bold tracking-tight text-white">
              Delete agent?
            </h2>
            <p id="delete-agent-desc" className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              <span className="font-semibold text-white">“{agentName}”</span> will be removed from
              this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <ul className="mt-4 space-y-2 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3.5 py-3 text-xs leading-relaxed text-[var(--muted)]">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-rose-300">
              •
            </span>
            <span>
              Its <span className="font-semibold text-[var(--text)]">embed key stops working immediately</span>{" "}
              — any website, app or WhatsApp link using it will stop replying.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-rose-300">
              •
            </span>
            <span>
              The agent, its configuration and the knowledge files you uploaded for it are removed.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-rose-300">
              •
            </span>
            <span>
              This can&apos;t be undone. Chat history and audit records are kept.
            </span>
          </li>
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted-dim)]">
          Only need it offline for a while?{" "}
          <span className="font-semibold text-amber-200">Disable</span> keeps the agent and its
          setup and just switches the embed off — you can turn it back on anytime.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-ghost flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-xl border border-rose-400/40 bg-rose-500 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete agent"}
          </button>
        </div>
      </div>
    </div>
  );
}
