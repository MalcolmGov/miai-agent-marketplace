"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat-stream-client";
import { renderRichText } from "@/lib/rich-text";
import { DEFAULT_BRAND_ID } from "@/lib/tenant-brands";

type Msg = { id: string; role: "user" | "assistant"; text: string };

/**
 * Focused consumer chat bound to a single specialist agent. Unlike the general assistant at /me
 * (connectors, brand switcher, reminders, life-graph), this is just the metered chat loop, always
 * scoped to `agentId`. Speaks the same SSE contract via streamChat → /api/consumer/chat.
 */
export default function SpecialistChat({
  agentId,
  agentName,
  starters,
}: {
  agentId: string;
  agentName: string;
  starters: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "greet",
      role: "assistant",
      text: `Hi — I'm your ${agentName}. What would you like to work on?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSugs, setShowSugs] = useState(true);
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  // The consumer wallet is keyed by the person; scope memory/knowledge to the default workspace.
  const ws = `?workspaceId=${encodeURIComponent(DEFAULT_BRAND_ID)}`;

  const loadWallet = useCallback(() => {
    fetch(`/api/consumer/wallet${ws}`)
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    loadWallet();
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
      await streamChat(
        `/api/consumer/chat${ws}`,
        { message: text, sessionId: sessionId.current, agentId },
        (ev) => {
          if (ev.type === "tool") {
            setTyping(true);
          } else if (ev.type === "delta") {
            appendChunk(ev.text, started);
            started = true;
          } else {
            // paused | done
            if (typeof ev.balance === "number") setBalance(ev.balance);
            if (!started && ev.reply) {
              appendChunk(ev.reply, false);
              started = true;
            }
          }
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
      setTyping(false);
      loadWallet();
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-[58vh] min-h-[400px] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)]">
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

        {showSugs && starters.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-4 pb-2 pt-1">
            {starters.map((s) => (
              <button key={s} type="button" onClick={() => submit(s)} className="suggestion" disabled={busy}>
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="px-4 pb-1 text-xs text-[var(--warn)]">{error}</p> : null}

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
            placeholder={`Message your ${agentName}…`}
            className="input min-w-0 flex-1 text-sm"
            disabled={busy}
            aria-label={`Message your ${agentName}`}
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
        Metered to your prepaid balance
        {typeof balance === "number" ? ` · ${balance.toLocaleString()} credits left` : ""}. Kept to what
        this specialist does; it guides rather than doing the work for you.
      </p>
    </div>
  );
}
