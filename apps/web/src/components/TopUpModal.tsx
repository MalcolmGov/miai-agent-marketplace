"use client";

import { useState } from "react";
import { TOPUP_PACKAGES } from "@miai/wallet-adapter";
import { beginTopUp } from "@/lib/topup-client";

function tokenLabel(tokens: number): string {
  return `${tokens.toLocaleString()} tokens`;
}

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
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  async function buy(packageId: string) {
    setBusy(packageId);
    setErr(null);
    const result = await beginTopUp(packageId, scope);
    if (result.kind === "credited") {
      onDone(result.tokens);
      onClose();
    } else if (result.kind === "error") {
      setErr(result.message);
    }
    // kind === "redirect" leaves the page; nothing more to do.
    setBusy(null);
  }

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
        <div className="grid gap-2 sm:grid-cols-2">
          {TOPUP_PACKAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-3 text-left transition hover:border-[var(--accent-dim)] disabled:opacity-60"
              onClick={() => void buy(p.id)}
            >
              <span>
                <span className="block font-medium">${p.usd}</span>
                <span className="text-xs text-[var(--muted)]">{tokenLabel(p.tokens)}</span>
              </span>
              <span className="text-sm text-[var(--accent)]">
                {busy === p.id ? "…" : "Buy"}
              </span>
            </button>
          ))}
        </div>
        {err ? <p className="mt-3 text-xs text-red-400">{err}</p> : null}
        <p className="mt-3 text-[11px] text-[var(--muted)]">
          Secure checkout by Paystack. You’ll return here once payment completes.
        </p>
      </div>
    </div>
  );
}
