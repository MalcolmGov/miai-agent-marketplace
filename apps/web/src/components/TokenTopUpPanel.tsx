"use client";

import { useState } from "react";
import { TOPUP_PACKAGES } from "@miai/wallet-adapter";
import { beginTopUp } from "@/lib/topup-client";

/**
 * Setup-flow payment step. No rental, no subscription (MVP): the agent activates for
 * free, and the business buys prepaid tokens that power replies. Real payments go
 * through Paystack; buying redirects to hosted checkout and returns to the dashboard.
 */
export function TokenTopUpPanel({
  activated,
  balanceTokens,
  saving,
  message,
  onActivate,
  onContinueLive,
  onCredited,
}: {
  activated: boolean;
  balanceTokens: number | null;
  saving: boolean;
  message: { kind: "ok" | "err"; text: string } | null;
  onActivate: () => Promise<boolean>;
  onContinueLive: () => void;
  /** Dev/mock fallback credited without leaving the page — refresh balance. */
  onCredited: (tokens: number) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function buy(packageId: string) {
    setBusy(packageId);
    setErr(null);
    const result = await beginTopUp(packageId, "workspace");
    if (result.kind === "credited") onCredited(result.tokens);
    else if (result.kind === "error") setErr(result.message);
    setBusy(null);
  }

  return (
    <div id="token-topup" className="panel mx-auto max-w-lg space-y-4 p-5 scroll-mt-24">
      <div>
        <h2 className="text-sm font-semibold">Add prepaid tokens</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          No subscription — a one-time top-up. Activating this agent is free; you only pay for the
          tokens it uses to reply. Top up any amount below.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2.5 text-xs text-[var(--muted)]">
        <div className="flex items-center justify-between gap-2">
          <span>Current balance</span>
          <span className="text-sm font-semibold text-[var(--text)]">
            {balanceTokens == null ? "…" : `${balanceTokens.toLocaleString()} tokens`}
          </span>
        </div>
        <p className="mt-1">Shared prepaid wallet across your workspace. Empty balance pauses replies.</p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Token packages">
        {TOPUP_PACKAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy !== null || saving}
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

      {(err || message?.kind === "err") && (
        <p className="text-xs text-red-400">{err ?? message?.text}</p>
      )}
      {message?.kind === "ok" ? <p className="text-xs text-[var(--accent)]">{message.text}</p> : null}

      <p className="text-[11px] text-[var(--muted)]">Secure checkout by Paystack. You’ll return here once payment completes.</p>

      <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
        {activated ? (
          <button type="button" className="btn btn-primary" onClick={onContinueLive}>
            Continue — Go live and activate
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onActivate()}
          >
            {saving ? "Activating…" : "Activate this agent (free)"}
          </button>
        )}
      </div>
    </div>
  );
}
