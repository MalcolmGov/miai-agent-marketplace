"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat-stream-client";
import { ConnectorIcon } from "@/components/ConnectorIcon";
import { renderRichText } from "@/lib/rich-text";
import CapabilitiesSheet from "./CapabilitiesSheet";
import {
  CONNECTOR_LABEL,
  FIRST_RUN_PROMPTS,
  STARTER_PROMPTS,
} from "@/lib/assistant-capabilities";
import {
  BRANDS,
  DEFAULT_BRAND_ID,
  brandThemeVars,
  getBrand,
  type Brand,
} from "@/lib/tenant-brands";

type Msg = { id: string; role: "user" | "assistant"; text: string };
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
const BRAND_KEY = "miai:me:brand:v1";
/** Below this, nudge the user that their prepaid balance is running low. */
const LOW_BALANCE = 500;

function greetingFor(brand: Brand): string {
  const who = brand.id === DEFAULT_BRAND_ID ? "your assistant" : `your ${brand.name} assistant`;
  return `Hi — I'm ${who}. What can I take off your plate today?`;
}

export default function AssistantHome() {
  const [brandId, setBrandId] = useState<string>(DEFAULT_BRAND_ID);
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greet", role: "assistant", text: greetingFor(getBrand(DEFAULT_BRAND_ID)) },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [showSugs, setShowSugs] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [briefOffer, setBriefOffer] = useState<BriefOffer>("hidden");
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);
  const briefOfferedRef = useRef(false);
  // Specialist pinned via /me?agent=<id> (a "Try free" card). Kept in a ref so it rides along on
  // every send without re-rendering; undefined = the general assistant.
  const agentIdRef = useRef<string | undefined>(undefined);

  const brand = getBrand(brandId);
  const connectedSet = new Set(connectors.filter((c) => c.connected).map((c) => c.connector));

  // The active brand doubles as the tenant: scope every consumer call to it so memory, wallet and
  // connectors reflect this brand (and switching brand switches the isolated context, per PR #49).
  const ws = `?workspaceId=${encodeURIComponent(brandId)}`;

  const loadWallet = useCallback(() => {
    fetch(`/api/consumer/wallet?workspaceId=${encodeURIComponent(brandId)}`)
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
  }, [brandId]);

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

  // Mount: restore the previewed brand + the one-time onboarding gates (client-only).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BRAND_KEY);
      if (stored && stored !== DEFAULT_BRAND_ID && getBrand(stored).id === stored) {
        setBrandId(stored);
        setMessages([{ id: "greet", role: "assistant", text: greetingFor(getBrand(stored)) }]);
      }
      if (!localStorage.getItem(ONBOARDED_KEY)) setShowWelcome(true);
      if (localStorage.getItem(BRIEF_OFFERED_KEY)) briefOfferedRef.current = true;
    } catch {
      /* private mode / storage disabled — just skip the one-time gates */
    }
    // Pin a specialist when arriving from a "Try free" card (/me?agent=<id>&label=<name>) so this
    // conversation runs that agent, and confirm it in the greeting.
    try {
      const params = new URLSearchParams(window.location.search);
      const a = params.get("agent");
      if (a) {
        agentIdRef.current = a;
        // Sanitize the reflected display label before it goes into an assistant message: those are
        // rendered through the markdown-aware rich-text renderer, so a raw ?label= could smuggle a
        // clickable link or a remote image into the trusted assistant bubble. Whitelist name-safe
        // characters only — this removes every markdown metacharacter, so no markup can form.
        const label = (params.get("label") ?? "").replace(/[^\p{L}\p{N} '&-]/gu, "").trim().slice(0, 40);
        setMessages([
          {
            id: "greet",
            role: "assistant",
            text: label
              ? `You're set up with your ${label}. What would you like to work on?`
              : "You're set up with your specialist. What would you like to work on?",
          },
        ]);
        setShowSugs(false);
      }
    } catch {
      /* no URL / SSR guard — fall back to the general assistant */
    }
  }, []);

  // Reload the per-brand context whenever the brand changes.
  useEffect(() => {
    loadWallet();
    loadConnectors();
    loadReminders();
  }, [loadWallet, loadConnectors, loadReminders]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  /** Switch the previewed brand: re-skin, and reset to a clean per-brand conversation + context. */
  function selectBrand(id: string) {
    if (id === brandId) return;
    setBrandId(id);
    try {
      localStorage.setItem(BRAND_KEY, id);
    } catch {
      /* ignore */
    }
    sessionId.current = crypto.randomUUID();
    agentIdRef.current = undefined; // drop any pinned specialist so sends match the clean general greeting
    setMessages([{ id: "greet", role: "assistant", text: greetingFor(getBrand(id)) }]);
    setShowSugs(true);
    setBriefOffer("hidden");
    setError(null);
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

  async function submit(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setShowSugs(false);
    setShowWelcome(false);
    setError(null);
    setInput("");

    const asstId = `a_${Date.now()}`;
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "user", text }]);
    setBusy(true);
    setTyping(true);

    const appendChunk = (chunk: string, started: boolean) => {
      if (!started) {
        setTyping(false);
        setMessages((m) => [...m, { id: asstId, role: "assistant", text: chunk }]);
      } else {
        setMessages((m) => m.map((msg) => (msg.id === asstId ? { ...msg, text: msg.text + chunk } : msg)));
      }
    };

    let replied = false;
    try {
      let started = false;
      await streamChat(`/api/consumer/chat${ws}`, { message: text, sessionId: sessionId.current, agentId: agentIdRef.current }, (ev) => {
        if (ev.type === "tool") {
          setTyping(true);
        } else if (ev.type === "delta") {
          appendChunk(ev.text, started);
          started = true;
          replied = true;
        } else {
          if (typeof ev.balance === "number") setBalance(ev.balance);
          if (!started && ev.reply) {
            appendChunk(ev.reply, false);
            started = true;
            replied = true;
          }
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setTyping(false);
      loadWallet();
      loadReminders();
      if (replied) maybeOfferBrief();
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

      {/* White-label preview: switch the brand this assistant is skinned for (demo affordance —
          a real carrier deployment fixes the brand by tenant). Each brand has its own memory. */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--muted)]">Preview brand:</span>
        {BRANDS.map((b) => {
          const active = b.id === brandId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => selectBrand(b.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition ${
                active
                  ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--text)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: b.accent }}
              />
              {b.name}
            </button>
          );
        })}
      </div>

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

      <div className="flex h-[62vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)]">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "border border-[var(--line)] bg-[var(--bg-panel)] text-[var(--text)]"
                }`}
              >
                {m.role === "assistant" ? renderRichText(m.text) : m.text}
              </div>
            </div>
          ))}
          {typing ? (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] px-3.5 py-2 text-sm text-[var(--muted)]">
                <span className="inline-flex gap-1">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:150ms]">●</span>
                  <span className="animate-pulse [animation-delay:300ms]">●</span>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {briefOffer !== "hidden" ? (
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
        ) : null}

        {showSugs ? (
          <div className="flex flex-wrap gap-2 px-4 pb-2 pt-1">
            {STARTER_PROMPTS.map((s) => (
              <button key={s} type="button" onClick={() => submit(s)} className="suggestion">
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="px-4 pb-1 text-xs text-[var(--warn)]">{error}</p>
        ) : null}

        <form
          className="flex items-end gap-2 border-t border-[var(--line)] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message your assistant…"
            className="input min-w-0 flex-1 text-sm"
            disabled={busy}
            aria-label="Message your assistant"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="btn btn-primary inline-flex h-10 items-center justify-center px-4 text-sm"
          >
            {busy ? "…" : "Send"}
          </button>
        </form>
      </div>

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
