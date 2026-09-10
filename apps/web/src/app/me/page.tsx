"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectorIcon } from "@/components/ConnectorIcon";
import { ConsumerAuthGate } from "@/components/ConsumerAuthGate";
import { ConsumerChatWindow } from "@/components/ConsumerChatWindow";
import { useConsumerChat } from "@/lib/use-consumer-chat";
import CapabilitiesSheet from "./CapabilitiesSheet";
import {
  CONNECTOR_LABEL,
  FIRST_RUN_PROMPTS,
  STARTER_PROMPTS,
} from "@/lib/assistant-capabilities";
import {
  DEFAULT_BRAND_ID,
  brandThemeVars,
  getBrand,
  type Brand,
} from "@/lib/tenant-brands";

type ConnectorStatus = { connector: string; connected: boolean };
type BriefOffer = "hidden" | "shown" | "saving" | "done" | "error";
type ReminderItem = {
  id: string;
  text: string;
  firesAt: string;
  recurring: string;
  channel: string;
};

/** Friendly, timezone-local label for when a reminder fires, and whether it's already due. */
function formatWhen(iso: string): { label: string; due: boolean } {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { label: "", due: false };
  const diff = t - Date.now();
  if (diff <= 0) return { label: "Due now", due: true };
  const min = Math.round(diff / 60000);
  if (min < 60) return { label: `in ${min}m`, due: false };
  const hr = Math.round(min / 60);
  if (hr < 24) return { label: `in ${hr}h`, due: false };
  const d = new Date(t);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const days = Math.round(hr / 24);
  if (days === 1) return { label: `tomorrow ${time}`, due: false };
  if (days < 7) return { label: `${d.toLocaleDateString([], { weekday: "short" })} ${time}`, due: false };
  return { label: `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`, due: false };
}

const ONBOARDED_KEY = "miai:me:onboarded:v1";
const BRIEF_OFFERED_KEY = "miai:me:briefOffered:v1";
/** Below this, nudge the user that their prepaid balance is running low. */
const LOW_BALANCE = 500;

function greetingFor(brand: Brand): string {
  const who = brand.id === DEFAULT_BRAND_ID ? "your assistant" : `your ${brand.name} assistant`;
  return `Hi — I'm ${who}. What can I take off your plate today?`;
}

function AssistantHome() {
  // Single tenant: MyInstantAI. (The white-label brand switcher was removed; a real deployment
  // fixes the brand by tenant. Every consumer call is still scoped to this workspace id.)
  const brandId = DEFAULT_BRAND_ID;
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [briefOffer, setBriefOffer] = useState<BriefOffer>("hidden");
  const [telegram, setTelegram] = useState<{ enabled: boolean; botUsername?: string | null; connected: boolean }>({
    enabled: false,
    connected: false,
  });
  const [tgBusy, setTgBusy] = useState(false);
  const briefOfferedRef = useRef(false);
  // Holds the active Telegram connect-poll interval so rapid re-clicks can't stack overlapping
  // polls and navigating away clears it (otherwise it kept fetching + setState on an unmounted tree).
  const tgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (tgPollRef.current) clearInterval(tgPollRef.current);
    },
    [],
  );

  // The chat loop (messages, prepaid balance, streaming turn) is shared with the specialist pages.
  // The assistant layers its own chrome — brand switcher, connectors, reminders, welcome — around it.
  const chat = useConsumerChat({
    workspaceId: brandId,
    initialGreeting: greetingFor(getBrand(DEFAULT_BRAND_ID)),
    onSubmitStart: () => setShowWelcome(false),
    onSettled: () => loadReminders(),
    onReplied: () => maybeOfferBrief(),
  });
  const { balance, submit, loadWallet } = chat;

  const brand = getBrand(brandId);
  const connectedSet = new Set(connectors.filter((c) => c.connected).map((c) => c.connector));

  // The active brand doubles as the tenant: scope every consumer call to it so memory, wallet and
  // connectors reflect this brand (and switching brand switches the isolated context, per PR #49).
  const ws = `?workspaceId=${encodeURIComponent(brandId)}`;

  const loadConnectors = useCallback(() => {
    fetch(`/api/consumer/connectors?workspaceId=${encodeURIComponent(brandId)}`)
      .then((r) => r.json())
      .then((d) => setConnectors(d.connectors ?? []))
      .catch(() => {});
  }, [brandId]);

  const loadReminders = useCallback(() => {
    fetch(`/api/consumer/reminders?workspaceId=${encodeURIComponent(brandId)}`)
      .then((r) => r.json())
      .then((d) => setReminders(Array.isArray(d.reminders) ? d.reminders : []))
      .catch(() => {});
  }, [brandId]);

  async function dismissReminderItem(id: string) {
    setReminders((rs) => rs.filter((r) => r.id !== id)); // optimistic
    try {
      await fetch(`/api/consumer/reminders/dismiss${ws}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* ignore — a failed dismiss just reappears on next load */
    }
    loadReminders();
  }

  // Mount: restore the one-time onboarding gates (client-only).
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDED_KEY)) setShowWelcome(true);
      if (localStorage.getItem(BRIEF_OFFERED_KEY)) briefOfferedRef.current = true;
    } catch {
      /* private mode / storage disabled — just skip the one-time gates */
    }
  }, []);

  // Reload the per-brand context whenever the brand changes.
  useEffect(() => {
    loadWallet();
    loadConnectors();
    loadReminders();
  }, [loadWallet, loadConnectors, loadReminders]);

  // Telegram channel availability + this consumer's link status (server env-gated).
  const refreshTelegram = useCallback(() => {
    fetch(`/api/consumer/telegram/connect${ws}`)
      .then((r) => r.json())
      .then((d) =>
        setTelegram({
          enabled: Boolean(d?.enabled),
          botUsername: d?.botUsername ?? null,
          connected: Boolean(d?.connected),
        }),
      )
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    refreshTelegram();
  }, [refreshTelegram]);

  /** Link this consumer to Telegram: mint a setup deep-link and open it, then poll for ~30s so the
   *  control flips to "Connected" once they press Start in Telegram. */
  async function connectTelegram() {
    setTgBusy(true);
    // Cancel any in-flight poll so a re-click doesn't stack a second interval on top of the first.
    if (tgPollRef.current) {
      clearInterval(tgPollRef.current);
      tgPollRef.current = null;
    }
    try {
      const r = await fetch(`/api/consumer/telegram/connect${ws}`, { method: "POST" });
      const d = await r.json();
      if (!d?.url) {
        setTgBusy(false); // nothing to open/poll — re-enable the button
        return;
      }
      window.open(d.url, "_blank", "noopener,noreferrer");
      let tries = 0;
      tgPollRef.current = setInterval(() => {
        if (++tries > 10) {
          if (tgPollRef.current) clearInterval(tgPollRef.current);
          tgPollRef.current = null;
          setTgBusy(false); // polling window elapsed — re-enable
          return;
        }
        refreshTelegram();
      }, 3000);
    } catch {
      setTgBusy(false); // failed — let the user retry
    }
  }

  /** Disconnect Telegram: unlink every chat bound to this consumer (they revert to standalone). */
  async function disconnectTelegram() {
    setTgBusy(true);
    try {
      await fetch(`/api/consumer/telegram/disconnect${ws}`, { method: "POST" });
      setTelegram((t) => ({ ...t, connected: false }));
    } catch {
      /* ignore — the user can retry */
    } finally {
      setTgBusy(false);
    }
  }

  function dismissWelcome() {
    setShowWelcome(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  /** Offer the daily brief once, after the user's first real reply — the habit that brings them back. */
  function maybeOfferBrief() {
    if (briefOfferedRef.current) return;
    briefOfferedRef.current = true;
    try {
      localStorage.setItem(BRIEF_OFFERED_KEY, "1");
    } catch {
      /* ignore */
    }
    setBriefOffer("shown");
  }

  async function enableBrief() {
    setBriefOffer("saving");
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const res = await fetch(`/api/consumer/brief${ws}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true, hour: 7, timezone, channel: "app" }),
      });
      setBriefOffer(res.ok ? "done" : "error");
    } catch {
      setBriefOffer("error");
    }
  }

  const runPrompt = (prompt: string) => {
    setSheetOpen(false);
    void submit(prompt);
  };

  return (
    <div
      className="brand-scope mx-auto flex max-w-2xl flex-col gap-4"
      style={brandThemeVars(brand) as React.CSSProperties}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {brand.name.charAt(0)}
            </span>
            <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
              {brand.name} <span className="text-[var(--muted)]">Assistant</span>
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted)]">{brand.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="btn btn-ghost inline-flex h-9 items-center gap-1 px-3 text-xs"
          >
            <span aria-hidden>✨</span> What I can do
          </button>
          {balance !== null ? (
            <span
              className={`chip whitespace-nowrap ${balance < LOW_BALANCE ? "text-[var(--warn)]" : ""}`}
              title="Your prepaid balance. Each message uses a small amount — you can top up any time."
            >
              {balance.toLocaleString()} credits
            </span>
          ) : null}
        </div>
      </header>

      {balance !== null && balance < LOW_BALANCE ? (
        <p className="-mt-1 text-xs text-[var(--warn)]">
          Your balance is running low — top up to keep your assistant available.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--muted)]">Accounts:</span>
        {connectors.length === 0 ? (
          <span className="text-[var(--muted)]">—</span>
        ) : (
          connectors.map((c) => (
            <span key={c.connector} className={`chip ${c.connected ? "chip-live" : "opacity-70"}`}>
              <ConnectorIcon connector={c.connector} size={13} />
              {CONNECTOR_LABEL[c.connector] ?? c.connector}
              {c.connected ? " ✓" : ""}
            </span>
          ))
        )}
        <Link
          href="/me/connectors"
          className="ml-1 text-[var(--muted)] underline decoration-1 underline-offset-2 hover:text-[var(--text)]"
        >
          Manage
        </Link>
      </div>

      {telegram.enabled ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">Channels:</span>
          {telegram.connected ? (
            <>
              <span className="chip chip-live inline-flex items-center gap-1.5">
                <span aria-hidden>✈️</span> Telegram connected ✓
              </span>
              <button
                type="button"
                onClick={disconnectTelegram}
                disabled={tgBusy}
                className="text-[var(--muted)] underline decoration-1 underline-offset-2 transition hover:text-[var(--text)] disabled:opacity-60"
              >
                {tgBusy ? "…" : "Disconnect"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={connectTelegram}
                disabled={tgBusy}
                className="chip inline-flex items-center gap-1.5 transition hover:text-[var(--text)] disabled:opacity-60"
              >
                <span aria-hidden>✈️</span> {tgBusy ? "Opening Telegram…" : "Connect Telegram"}
              </button>
              <span className="text-[var(--muted)]">
                — chat on Telegram; it shares your assistant&apos;s memory.
              </span>
            </>
          )}
        </div>
      ) : null}

      {reminders.length > 0 ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Reminders
            </h2>
            <span className="text-[11px] text-[var(--muted)]">
              In your app{connectedSet.has("google_calendar") ? " + calendar" : ""}
            </span>
          </div>
          <ul className="space-y-1.5">
            {reminders.map((r) => {
              const w = formatWhen(r.firesAt);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-[var(--text)]">{r.text}</span>
                  <span className={`chip shrink-0 text-[11px] ${w.due ? "chip-live" : ""}`}>
                    {w.label}
                    {r.recurring ? " · repeats" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissReminderItem(r.id)}
                    aria-label="Dismiss reminder"
                    className="shrink-0 text-[var(--muted)] transition hover:text-[var(--text)]"
                  >
                    ✓
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showWelcome ? (
        <section className="relative rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-5">
          <button
            type="button"
            onClick={dismissWelcome}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
          <h2 className="display text-lg font-semibold tracking-tight text-[var(--text)]">
            Welcome — here&apos;s how to think of me
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--text)]">
            I&apos;m a personal assistant for your everyday life. I can handle your{" "}
            <strong>email</strong> and <strong>calendar</strong>, keep your{" "}
            <strong>reminders and to-dos</strong>, <strong>look things up</strong>, and{" "}
            <strong>remember your preferences</strong> so you never repeat yourself. Just talk to me
            normally — and I&apos;ll always check with you before sending or changing anything.
          </p>
          <p className="mt-3 text-xs font-medium text-[var(--muted)]">Try one of these to start:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FIRST_RUN_PROMPTS.map((s) => (
              <button key={s} type="button" onClick={() => runPrompt(s)} className="suggestion">
                {s}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="btn btn-primary inline-flex h-9 items-center px-4 text-sm"
            >
              See everything I can do
            </button>
            <button
              type="button"
              onClick={dismissWelcome}
              className="text-sm text-[var(--muted)] underline decoration-1 underline-offset-2 hover:text-[var(--text)]"
            >
              Got it
            </button>
          </div>
        </section>
      ) : null}

      <ConsumerChatWindow
        chat={chat}
        starters={STARTER_PROMPTS}
        placeholder="Message your assistant…"
        ariaLabel="Message your assistant"
        className="h-[62vh] min-h-[420px]"
        footer={
          briefOffer !== "hidden" ? (
            <div className="mx-4 mb-1 rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-3 text-sm">
              {briefOffer === "done" ? (
                <p className="text-[var(--text)]">
                  Done — I&apos;ll send you a morning catch-up at 7am. You can change or turn it off any time.
                </p>
              ) : briefOffer === "error" ? (
                <p className="text-[var(--warn)]">
                  Couldn&apos;t set that up just now — you can try again later from your settings.
                </p>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[var(--text)]">
                    Want a quick <strong>morning catch-up</strong> each day — your schedule, inbox and
                    what needs attention?
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={briefOffer === "saving"}
                      onClick={enableBrief}
                      className="btn btn-primary inline-flex h-8 items-center px-3 text-xs"
                    >
                      {briefOffer === "saving" ? "…" : "Yes, 7am"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBriefOffer("hidden")}
                      className="text-xs text-[var(--muted)] underline decoration-1 underline-offset-2 hover:text-[var(--text)]"
                    >
                      No thanks
                    </button>
                  </span>
                </div>
              )}
            </div>
          ) : null
        }
      />

      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        Metered to your prepaid balance. Your assistant confirms with you before sending anything or
        changing your calendar.
      </p>

      <CapabilitiesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onRun={runPrompt}
        connected={connectedSet}
      />
    </div>
  );
}

/**
 * Gate the assistant behind sign-in when real (oidc) auth is on: the gate renders a sign-in card
 * instead of mounting AssistantHome, so its per-brand wallet/connector/reminder fetches never fire
 * for a signed-out person. In mock mode the gate is transparent.
 */
export default function MePage() {
  return (
    <ConsumerAuthGate>
      <AssistantHome />
    </ConsumerAuthGate>
  );
}
