"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  CAPABILITY_GROUPS,
  unmetConnectorLabels,
  type CapabilityGroup,
} from "@/lib/assistant-capabilities";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Run one of a group's example prompts (submits it and closes the sheet). */
  onRun: (prompt: string) => void;
  /** Which accounts the user has connected, so groups show connect hints just-in-time. */
  connected: Set<string>;
};

/**
 * The reopenable "What I can do" panel — the persistent answer to the question the empty-state
 * chips can't hold once they vanish. Groups are life-area shaped; each example is tap-to-run, and
 * groups that work best with an account the user hasn't linked show a gentle Connect hint rather
 * than failing silently later.
 */
export default function CapabilitiesSheet({ open, onClose, onRun, connected }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="What your assistant can do"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--line)] bg-[var(--bg-panel)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="display text-xl font-semibold tracking-tight text-[var(--text)]">
              What I can do
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--card-meta)]">
              Tap any example to try it. The top two work with nothing connected.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost inline-flex h-8 w-8 items-center justify-center p-0 text-base"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          {CAPABILITY_GROUPS.map((group) => (
            <GroupCard key={group.key} group={group} connected={connected} onRun={onRun} />
          ))}
        </div>

        <div className="border-t border-[var(--line)] px-5 py-3.5 text-xs leading-relaxed text-[var(--card-meta)]">
          I confirm with you before sending an email or changing your calendar — and I only use the
          accounts you choose to connect.
        </div>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  connected,
  onRun,
}: {
  group: CapabilityGroup;
  connected: Set<string>;
  onRun: (prompt: string) => void;
}) {
  const unmet = unmetConnectorLabels(group.needs, connected);
  const fullyConnected = group.needs.length > 0 && unmet.length === 0;

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_45%,transparent)] p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_28%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-lg leading-none"
        >
          {group.icon}
        </span>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
              {group.title}
            </h3>
            {fullyConnected ? (
              <span className="chip chip-live text-[10px]">Connected ✓</span>
            ) : unmet.length > 0 ? (
              <Link href="/me/connectors" className="chip text-[10px] hover:opacity-80">
                Connect {unmet.join(" · ")}
              </Link>
            ) : null}
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--card-body)]">{group.blurb}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {group.examples.map((ex) => (
              <button key={ex} type="button" onClick={() => onRun(ex)} className="suggestion">
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
