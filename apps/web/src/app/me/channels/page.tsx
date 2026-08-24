"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TelegramSetup = {
  configured: boolean;
  botUsername?: string;
  deepLink?: string;
  reason?: string;
};

type ChannelState = "loading" | "ready" | "unavailable" | "coming-soon";

/**
 * Channels — where a consumer connects their assistant to the messaging apps they already use.
 * Telegram is live (deep-link setup); WhatsApp and SMS are staged next.
 */
export default function ChannelsPage() {
  const [telegram, setTelegram] = useState<TelegramSetup | null>(null);
  const [tgState, setTgState] = useState<ChannelState>("loading");

  useEffect(() => {
    fetch("/api/consumer/telegram/setup")
      .then((r) => r.json())
      .then((d: TelegramSetup) => {
        setTelegram(d);
        setTgState(d.configured ? "ready" : "unavailable");
      })
      .catch(() => setTgState("unavailable"));
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
          Channels
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Talk to your assistant where you already are. Connect a channel and it&apos;s the same
          assistant — same memory, same wallet.
        </p>
      </div>

      <div className="space-y-3">
        {/* Telegram */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-4">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 text-2xl">
              ✈️
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text)]">Telegram</h2>
                {tgState === "ready" ? (
                  <span className="chip chip-live text-[11px]">Live</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Message your assistant on Telegram. Private, fast, and syncs with the app.
              </p>

              {tgState === "loading" ? (
                <p className="mt-3 text-xs text-[var(--muted)]">Checking…</p>
              ) : tgState === "ready" && telegram?.deepLink ? (
                <a
                  href={telegram.deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary mt-3 inline-flex h-9 items-center px-4 text-sm"
                >
                  Connect on Telegram
                </a>
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Telegram isn&apos;t set up on this deployment yet — check back soon.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-4 opacity-70">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 text-2xl">
              💬
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text)]">WhatsApp</h2>
                <span className="chip text-[11px]">Coming soon</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Message your assistant on WhatsApp — the same assistant, wherever you are.
              </p>
            </div>
          </div>
        </div>

        {/* SMS */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-4 opacity-70">
          <div className="flex items-start gap-3">
            <span aria-hidden className="mt-0.5 text-2xl">
              📱
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--text)]">SMS</h2>
                <span className="chip text-[11px]">Coming soon</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                Reach your assistant by text — no app or data needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[var(--line)] pt-5">
        <Link
          href="/me"
          className="text-sm text-[var(--accent)] underline decoration-1 underline-offset-2 hover:opacity-80"
        >
          ← Back to chat
        </Link>
      </div>
    </div>
  );
}
