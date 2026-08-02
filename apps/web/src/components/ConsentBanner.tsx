"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "miai_consent_v1";

type ConsentValue = "accepted" | "essential";

function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "accepted" || v === "essential") return v;
  } catch {
    /* private mode */
  }
  return null;
}

function writeConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Lightweight cookie / analytics consent capture (Phase 4 I1). */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  function choose(value: ConsentValue) {
    writeConsent(value);
    setVisible(false);
    void fetch("/api/consent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ choice: value }),
    }).catch(() => {
      /* audit optional — localStorage is source of truth for banner */
    });
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.25)] sm:px-6"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          We use essential storage for theme and session. Optional analytics cookies only run if you
          accept.{" "}
          <Link href="/cookies" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
            Cookie notice
          </Link>
          {" · "}
          <Link href="/privacy" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
            Privacy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="chip" onClick={() => choose("essential")}>
            Essential only
          </button>
          <button
            type="button"
            className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => choose("accepted")}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
