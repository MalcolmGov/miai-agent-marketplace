"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { isChatLanguage, type ChatLanguageCode } from "@/lib/chat-languages";
import { LOCALE_STORAGE_KEY } from "@/lib/locale-boot";
import "./marketplace-assistant.css";

type Msg = { id: string; role: "user" | "assistant"; text: string };

const AVATAR = "/brand/miai-assistant-avatar.png";

const GREETING =
  "Hi — I can help you pick an agent, walk through rent → configure → Install (Website, App, WhatsApp), explain privacy & security, pricing, or connect you with our team. What would you like to know?";

const SUGGESTIONS = [
  "How do I set up an agent?",
  "Recommend an agent for bookings",
  "Privacy & security",
  "How do tokens work?",
  "Talk to sales",
];

const SEND = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

function newSession() {
  return `ask_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function detectReplyLanguage(): ChatLanguageCode {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isChatLanguage(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

/** Linkify https URLs and known marketplace paths inside assistant text. */
export function linkifyAssistantText(text: string): ReactNode[] {
  const re =
    /(https?:\/\/[^\s<]+)|(\/(?:agents\/[A-Za-z0-9_-]+|trust|demo|roadmap|ask|admin)(?:\/[A-Za-z0-9_-]+)*)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0].replace(/[),.;]+$/, "");
    const trailing = m[0].slice(token.length);
    if (token.startsWith("http")) {
      out.push(
        <a key={key++} href={token} target="_blank" rel="noreferrer">
          {token}
        </a>,
      );
    } else {
      out.push(
        <Link key={key++} href={token}>
          {token}
        </Link>,
      );
    }
    if (trailing) out.push(trailing);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}

export function MarketplaceAssistant({ mode }: { mode: "floating" | "page" }) {
  const [open, setOpen] = useState(mode === "page");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSugs, setShowSugs] = useState(true);
  const sessionId = useRef(newSession());
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const greeted = useRef(false);

  const scrollBottom = useCallback(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const focusInput = useCallback(() => {
    // After React re-enables the field / remounts the panel.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    scrollBottom();
  }, [messages, typing, scrollBottom]);

  useEffect(() => {
    if (mode === "page" || open) {
      if (!greeted.current) {
        greeted.current = true;
        setMessages([{ id: "greet", role: "assistant", text: GREETING }]);
      }
      focusInput();
    }
  }, [mode, open, focusInput]);

  function resetChat() {
    sessionId.current = newSession();
    greeted.current = false;
    setMessages([]);
    setInput("");
    setBusy(false);
    setTyping(false);
    setError(null);
    setShowSugs(true);
  }

  function closeFloating() {
    resetChat();
    setOpen(false);
  }

  async function submit(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setShowSugs(false);
    setError(null);
    setInput("");
    const userId = `u_${Date.now()}`;
    setMessages((m) => [...m, { id: userId, role: "user", text }]);
    setBusy(true);
    setTyping(true);
    try {
      const res = await fetch("/api/ask/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          replyLanguage: detectReplyLanguage(),
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string; paused?: boolean };
      setTyping(false);
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setMessages((m) => [
          ...m,
          {
            id: `e_${Date.now()}`,
            role: "assistant",
            text: "I hit a snag answering that — please try again in a moment.",
          },
        ]);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: data.paused
            ? data.reply || "We're briefly paused on tokens — please try again shortly."
            : data.reply || "…",
        },
      ]);
    } catch {
      setTyping(false);
      setError("Connection issue");
      setMessages((m) => [
        ...m,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          text: "Connection issue — please try again.",
        },
      ]);
    } finally {
      setBusy(false);
      setTyping(false);
      focusInput();
    }
  }

  const panel = (
    <div className={mode === "page" ? "miai-ask-page" : "miai-ask-dock"}>
      <header className="miai-ask-head">
        <div className="miai-ask-ava">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="" />
        </div>
        <div className="miai-ask-ttl">
          <b>My Instant AI assistant</b>
          <span>Ask anything about the product</span>
        </div>
        {mode === "floating" && (
          <button type="button" className="miai-ask-x" aria-label="Close and clear chat" onClick={closeFloating}>
            ×
          </button>
        )}
      </header>

      <div className="miai-ask-msgs" ref={msgsRef}>
        {messages.map((m) => (
          <div key={m.id} className={`miai-ask-m ${m.role === "user" ? "miai-ask-u" : "miai-ask-a"}`}>
            {m.role === "assistant" ? linkifyAssistantText(m.text) : m.text}
          </div>
        ))}
        {typing && (
          <div className="miai-ask-typing" aria-label="Assistant is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      {error && <div className="miai-ask-err">{error}</div>}

      {showSugs && (
        <div className="miai-ask-sugs">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="miai-ask-chip"
              disabled={busy}
              onClick={() => void submit(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="miai-ask-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
      >
        <input
          ref={inputRef}
          className="miai-ask-input"
          type="text"
          enterKeyHint="send"
          value={input}
          placeholder="Ask anything..."
          autoComplete="off"
          // Keep focusable while a reply streams — `disabled` steals the caret.
          readOnly={busy}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message"
        />
        <button className="miai-ask-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          {SEND}
        </button>
      </form>
    </div>
  );

  if (mode === "page") {
    return <div className="miai-ask">{panel}</div>;
  }

  return (
    <div className="miai-ask">
      {open && panel}
      <button
        type="button"
        className="miai-ask-fab"
        aria-label={open ? "Close My Instant AI assistant" : "Open My Instant AI assistant"}
        onClick={() => {
          if (open) closeFloating();
          else setOpen(true);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AVATAR} alt="" />
      </button>
    </div>
  );
}
