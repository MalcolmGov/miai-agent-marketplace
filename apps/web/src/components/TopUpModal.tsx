"use client";

import { useEffect, useRef } from "react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topup-dialog-title"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="panel w-full max-w-md p-5 rise shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="topup-dialog-title" className="text-lg font-semibold">
              {t("topup.title")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("topup.desc")}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost px-2 py-1"
            onClick={onClose}
            aria-label={t("topup.close")}
          >
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
          {t("topup.paystackNotice")}
        </p>
      </div>
    </div>
  );
}
