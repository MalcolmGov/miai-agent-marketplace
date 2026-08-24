"use client";

import { TokenPackageGrid } from "./TokenPackageGrid";

export function TopUpModal({
  open,
  onClose,
  onDone,
  scope = "workspace",
}: {
  open: boolean;
  onClose: () => void;
  /** Called only for the dev/mock fallback credit. Paystack top-ups leave the page. */
  onDone: (tokens: number) => void;
  scope?: "workspace" | "consumer";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md p-5 rise shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Top up prepaid tokens</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              One-time top-up — no subscription. Tokens power every reply; an empty balance pauses
              the agent until you top up again.
            </p>
          </div>
          <button type="button" className="btn btn-ghost px-2 py-1" onClick={onClose}>
            ✕
          </button>
        </div>
        <TokenPackageGrid
          scope={scope}
          className="grid gap-2 sm:grid-cols-2"
          onCredited={(tokens) => {
            onDone(tokens);
            onClose();
          }}
        />
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          Secure checkout by Paystack. You’ll return here once payment completes.
        </p>
      </div>
    </div>
  );
}
