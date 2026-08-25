"use client";

import type { ReactNode } from "react";
import { renderRichText } from "@/lib/rich-text";
import type { ConsumerChat } from "@/lib/use-consumer-chat";

/**
 * The shared chat surface — message list, typing indicator, starter prompts and composer — driven
 * by a useConsumerChat() instance. Both the general assistant (/me) and the specialist pages render
 * it; each supplies its own placeholder, starters and (optionally) an inline `footer` slot shown
 * between the transcript and the composer (the assistant uses it for the daily-brief offer).
 */
export function ConsumerChatWindow({
  chat,
  starters,
  placeholder,
  ariaLabel,
  onStarter,
  footer,
  className = "h-[60vh] min-h-[420px]",
}: {
  chat: ConsumerChat;
  starters: string[];
  placeholder: string;
  ariaLabel: string;
  onStarter?: (prompt: string) => void;
  footer?: ReactNode;
  className?: string;
}) {
  const { messages, typing, showSugs, submit, input, setInput, busy, error, scrollRef } = chat;
  const runStarter = onStarter ?? submit;

  return (
    <div
      className={`flex ${className} flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_35%,transparent)]`}
    >
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

      {footer}

      {showSugs && starters.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-4 pb-2 pt-1">
          {starters.map((s) => (
            <button key={s} type="button" onClick={() => runStarter(s)} className="suggestion" disabled={busy}>
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
          placeholder={placeholder}
          className="input min-w-0 flex-1 text-sm"
          disabled={busy}
          aria-label={ariaLabel}
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
  );
}
