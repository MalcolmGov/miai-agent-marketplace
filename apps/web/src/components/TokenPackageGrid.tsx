"use client";

import { useState } from "react";
import { TOPUP_PACKAGES } from "@miai/wallet-adapter";
import { beginTopUp } from "@/lib/topup-client";

/**
 * The prepaid-token package menu ($5–$200) with its buy flow. Shared by the wallet
 * TopUpModal and the setup-flow TokenTopUpPanel so the grid markup + Paystack redirect
 * (and the dev/mock fallback) live in exactly one place.
 */
export function TokenPackageGrid({
  scope,
  disabled = false,
  className = "grid grid-cols-2 gap-2",
  onCredited,
}: {
  scope: "workspace" | "consumer";
  disabled?: boolean;
  className?: string;
  /** Called only for the dev/mock fallback credit; Paystack top-ups leave the page. */
  onCredited?: (tokens: number) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function buy(packageId: string) {
    setBusy(packageId);
    setErr(null);
    const result = await beginTopUp(packageId, scope);
    if (result.kind === "credited") onCredited?.(result.tokens);
    else if (result.kind === "error") setErr(result.message);
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <div className={className} role="group" aria-label="Token packages">
        {TOPUP_PACKAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled || busy !== null}
            className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-3 text-left transition hover:border-[var(--accent-dim)] disabled:opacity-60"
            onClick={() => void buy(p.id)}
          >
            <span>
              <span className="block font-medium">${p.usd}</span>
              <span className="text-xs text-[var(--muted)]">{p.tokens.toLocaleString()} tokens</span>
            </span>
            <span className="text-sm text-[var(--accent)]">{busy === p.id ? "…" : "Buy"}</span>
          </button>
        ))}
      </div>
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
    </div>
  );
}
