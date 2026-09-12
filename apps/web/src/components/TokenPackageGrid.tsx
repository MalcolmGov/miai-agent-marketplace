"use client";

import { useState } from "react";
import { TOPUP_PACKAGES } from "@miai/wallet-adapter";
import { beginTopUp } from "@/lib/topup-client";

function packageMeta(id: string) {
  if (id === "20") {
    return {
      badge: "⭐ Popular",
      badgeClass: "bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_0_10px_rgba(61,214,198,0.5)]",
      borderClass:
        "border-[var(--accent)]/70 bg-gradient-to-b from-[var(--accent)]/15 via-[var(--accent)]/5 to-transparent shadow-[0_0_20px_rgba(61,214,198,0.15)]",
      turns: "~8,400 turns",
    };
  }
  if (id === "200") {
    return {
      badge: "🔥 Best Value (+15%)",
      badgeClass: "bg-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]",
      borderClass:
        "border-amber-500/60 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.12)]",
      turns: "~138,000 turns",
    };
  }
  if (id === "5") return { turns: "~1,300 turns" };
  if (id === "10") return { turns: "~3,000 turns" };
  if (id === "50") return { turns: "~25,000 turns" };
  if (id === "100") return { turns: "~55,000 turns" };
  return { turns: `${Math.round(Number(id) * 600).toLocaleString()} turns` };
}

/**
 * The prepaid-token package menu ($5–$200) with its buy flow. Shared by the wallet
 * TopUpModal and the setup-flow TokenTopUpPanel so the grid markup + Paystack redirect
 * (and the dev/mock fallback) live in exactly one place.
 */
export function TokenPackageGrid({
  scope,
  disabled = false,
  className = "grid grid-cols-2 gap-2.5",
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
        {TOPUP_PACKAGES.map((p) => {
          const meta = packageMeta(p.id);
          const isBusy = busy === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled || busy !== null}
              aria-busy={isBusy}
              className={`relative flex flex-col justify-between rounded-xl border p-3 sm:p-3.5 text-left transition-all duration-200 active:scale-[0.97] group min-h-[88px] ${
                meta.borderClass ??
                "border-[var(--line)] bg-[var(--bg-elev)]/50 hover:border-white/25 hover:bg-[var(--bg-elev)]"
              } disabled:opacity-60`}
              onClick={() => void buy(p.id)}
            >
              {meta.badge ? (
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${meta.badgeClass}`}
                  >
                    {meta.badge}
                  </span>
                </div>
              ) : null}

              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                    ${p.usd}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[var(--muted)]">
                    USD
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--accent)] font-mono tabular-nums">
                    {p.tokens.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[var(--muted-dim)]">tokens</span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
                <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                  <span>⚡</span>
                  <span>{meta.turns}</span>
                </span>
                <span className="text-xs font-bold text-[var(--accent)] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  {isBusy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"
                        aria-hidden
                      />
                      <span className="text-[11px]">Redirecting…</span>
                    </span>
                  ) : (
                    <>
                      <span>Buy</span>
                      <span>→</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {err ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

