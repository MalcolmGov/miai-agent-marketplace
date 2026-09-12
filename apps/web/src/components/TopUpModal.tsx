"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/locale";
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
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const url = scope === "consumer" ? "/api/consumer/wallet" : "/api/wallet";
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.tokens === "number") setBalance(data.tokens);
      })
      .catch(() => {});
  }, [open, scope]);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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

    const timer = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topup-dialog-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-default transition-opacity"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="panel card-specular-rim relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)]/95 backdrop-blur-2xl p-5 sm:p-6 rise shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(61,214,198,0.2)] max-h-[92dvh] overflow-y-auto"
      >
        <div className="card-specular-rim" />
        {/* Mobile grab handle */}
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20 sm:hidden" />

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-xs">
                ⚡
              </span>
              <h2 id="topup-dialog-title" className="text-lg font-bold text-white tracking-tight">
                {t("topup.title")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("topup.desc")}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-[var(--muted)] hover:text-white transition-colors text-sm font-bold"
            onClick={onClose}
            aria-label={t("topup.close")}
          >
            ✕
          </button>
        </div>

        {/* Live Wallet Balance Pill */}
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[var(--muted)]">Current Wallet Balance</span>
          </div>
          <span className="font-mono font-bold text-white tabular-nums text-sm">
            {balance === null ? "…" : `${balance.toLocaleString()} tokens`}
          </span>
        </div>

        <TokenPackageGrid
          scope={scope}
          className="grid gap-2.5 grid-cols-2"
          onCredited={(tokens) => {
            setBalance((b) => (b ?? 0) + tokens);
            onDone(tokens);
            onClose();
          }}
        />

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <span>🔒</span>
            <span>{t("topup.paystackNotice")}</span>
          </span>
          <span className="text-[10px] text-[var(--accent)] font-medium">Never Expire</span>
        </div>
      </div>
    </div>
  );
}

