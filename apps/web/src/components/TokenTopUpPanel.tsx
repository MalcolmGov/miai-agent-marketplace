"use client";

import { TokenPackageGrid } from "./TokenPackageGrid";

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

      <TokenPackageGrid scope="workspace" disabled={saving} onCredited={onCredited} />

      {message?.kind === "err" ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {message.text}
        </p>
      ) : null}
      {message?.kind === "ok" ? (
        <p className="text-xs text-[var(--accent)]" role="status">
          {message.text}
        </p>
      ) : null}

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
