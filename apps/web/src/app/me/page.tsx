"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat-stream-client";

type Msg = { id: string; role: "user" | "assistant"; text: string };
type ConnectorStatus = { connector: string; connected: boolean };

// Starter prompts — one per core capability (inbox, calendar, email drafting, reminders,
// tasks, memory) so a first-time user can see what the assistant can do at a glance.
const SUGGESTIONS = [
  "Catch me up on my inbox",
  "What's on my calendar today?",
  "Draft a reply to my latest email",
  "Remind me to call the pharmacy at 5",
  "Add 'pick up dry cleaning' to my to-do list",
  "Remember that I prefer morning meetings",
];

const CONNECTOR_LABEL: Record<string, string> = {
  email: "Gmail",
  google_calendar: "Calendar",
};

export default function AssistantHome() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: "greet", role: "assistant", text: "Hi — I'm your assistant. What can I take off your plate today?" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [showSugs, setShowSugs] = useState(true);
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadWallet = useCallback(() => {
    fetch("/api/consumer/wallet")
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadWallet();
    fetch("/api/consumer/connectors")
      .then((r) => r.json())
      .then((d) => setConnectors(d.connectors ?? []))
      .catch(() => {});
  }, [loadWallet]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  async function submit(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setShowSugs(false);
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

    try {
      let started = false;
      await streamChat("/api/consumer/chat", { message: text, sessionId: sessionId.current }, (ev) => {
        if (ev.type === "tool") {
          setTyping(true);
        } else if (ev.type === "delta") {
          appendChunk(ev.text, started);
          started = true;
        } else {
          if (typeof ev.balance === "number") setBalance(ev.balance);
          if (!started && ev.reply) {
            appendChunk(ev.reply, false);
            started = true;
          }
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setTyping(false);
      loadWallet();
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
            Your assistant
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            A personal AI that works with your inbox, calendar, reminders and more.
          </p>
        </div>
        {balance !== null ? (
          <span className="chip whitespace-nowrap" title="Your prepaid balance">
            {balance.toLocaleString()} tokens
          </span>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--muted)]">Accounts:</span>
        {connectors.length === 0 ? (
          <span className="text-[var(--muted)]">—</span>
        ) : (
          connectors.map((c) => (
            <span key={c.connector} className={`chip ${c.connected ? "chip-live" : "opacity-70"}`}>
              {CONNECTOR_LABEL[c.connector] ?? c.connector}
              {c.connected ? " ✓" : ""}
            </span>
          ))
        )}
        <Link
          href="/me/connectors"
          className="ml-1 text-[var(--accent)] underline decoration-1 underline-offset-2"
        >
          Manage
        </Link>
      </div>

      <div className="flex h-[62vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)]">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-[var(--bg-panel)] text-[var(--text)]"
                }`}
              >
                {m.text}
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

        {showSugs ? (
          <div className="flex flex-wrap gap-2 px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="chip cursor-pointer hover:opacity-80"
              >
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
    </div>
  );
}
