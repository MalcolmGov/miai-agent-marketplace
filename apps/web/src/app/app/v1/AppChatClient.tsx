"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./app-chat.css";

type Msg = { id: string; role: "user" | "assistant"; text: string };

function newSession() {
  return `app_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function parseSseBlocks(buffer: string): { events: Array<{ event: string; data: string }>; rest: string } {
  const events: Array<{ event: string; data: string }> = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    if (!block.trim()) continue;
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}

const SPARK = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
  </svg>
);

const SEND = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function AppChatClient({
  embedKey,
  title,
  accent,
  accent2,
  greeting,
  suggestions,
  lang,
}: {
  embedKey: string;
  title: string;
  accent: string;
  accent2: string;
  greeting: string;
  suggestions: string[];
  lang: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSugs, setShowSugs] = useState(true);
  const sessionId = useRef(newSession());
  const msgsRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const greeted = useRef(false);

  const style = useMemo(
    () =>
      ({
        ["--mi-a" as string]: accent,
        ["--mi-a2" as string]: accent2,
      }) as React.CSSProperties,
    [accent, accent2],
  );

  const scrollBottom = useCallback(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollBottom();
  }, [messages, typing, scrollBottom]);

  /** Lock host document + pin height above the soft keyboard (iOS / Android WebView). */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyBg: body.style.background,
      rootOverflow: (document.getElementById("app-root") as HTMLElement | null)?.style.overflow,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.background = "#0a0f16";
    const appRoot = document.getElementById("app-root") as HTMLElement | null;
    if (appRoot) appRoot.style.overflow = "hidden";

    const apply = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.height = "100dvh";
        root.style.transform = "";
        return;
      }
      root.style.height = `${Math.round(vv.height)}px`;
      root.style.transform = `translateY(${Math.round(vv.offsetTop)}px)`;
    };

    apply();
    window.visualViewport?.addEventListener("resize", apply);
    window.visualViewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      window.visualViewport?.removeEventListener("resize", apply);
      window.visualViewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.background = prev.bodyBg;
      if (appRoot) appRoot.style.overflow = prev.rootOverflow || "";
    };
  }, []);

  useEffect(() => {
    if (!embedKey || greeted.current) return;
    greeted.current = true;
    setMessages([{ id: "greet", role: "assistant", text: greeting }]);
  }, [embedKey, greeting]);

  async function submit(raw: string) {
    const text = raw.trim();
    if (!text || busy || !embedKey) return;
    setShowSugs(false);
    setError(null);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userId = `u_${Date.now()}`;
    const asstId = `a_${Date.now()}`;
    setMessages((m) => [...m, { id: userId, role: "user", text }]);
    setBusy(true);
    setTyping(true);

    try {
      const res = await fetch("/api/app/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify({
          key: embedKey,
          message: text,
          sessionId: sessionId.current,
          replyLanguage: lang || "en",
        }),
      });

      if (!res.ok && !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        throw new Error(j?.detail || j?.error || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let started = false;
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const { events, rest } = parseSseBlocks(buf);
        buf = rest;
        for (const ev of events) {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(ev.data) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (ev.event === "error") {
            throw new Error(String(data.detail || data.error || "Chat failed"));
          }
          if (ev.event === "status" && data.phase === "tool") {
            // Model chose a tool — clear any partial streamed preface, show typing again.
            started = false;
            full = "";
            setTyping(true);
            setMessages((m) => m.filter((msg) => msg.id !== asstId));
            continue;
          }
          if (ev.event === "delta" && typeof data.text === "string") {
            if (!started) {
              started = true;
              setTyping(false);
              setMessages((m) => [...m, { id: asstId, role: "assistant", text: data.text as string }]);
            } else {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === asstId ? { ...msg, text: msg.text + (data.text as string) } : msg,
                ),
              );
            }
            full += data.text as string;
          }
          if (ev.event === "paused" || (ev.event === "done" && data.paused)) {
            const reply =
              typeof data.reply === "string"
                ? data.reply
                : full || "We're briefly paused — please try again shortly.";
            setTyping(false);
            if (!started) {
              setMessages((m) => [...m, { id: asstId, role: "assistant", text: reply }]);
            } else {
              setMessages((m) => m.map((msg) => (msg.id === asstId ? { ...msg, text: reply } : msg)));
            }
            started = true;
          }
          if (ev.event === "done" && !data.paused && typeof data.reply === "string" && !started) {
            setTyping(false);
            setMessages((m) => [...m, { id: asstId, role: "assistant", text: data.reply as string }]);
            started = true;
          }
        }
      }

      if (!started) {
        setTyping(false);
        setMessages((m) => [
          ...m,
          { id: asstId, role: "assistant", text: "Something went wrong — please try again." },
        ]);
      }
    } catch (e) {
      setTyping(false);
      setError(e instanceof Error ? e.message : "Connection issue");
      setMessages((m) => [
        ...m,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: "Connection issue — please try again.",
        },
      ]);
    } finally {
      setBusy(false);
      setTyping(false);
      inputRef.current?.focus();
    }
  }

  function onInputChange(v: string) {
    setInput(v);
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  if (!embedKey) {
    return (
      <div className="mi-app" style={style} ref={rootRef}>
        <div className="mi-app-empty">
          Missing <code>key</code> query param. Open this page from Agent Studio → Install → App, or
          append <code>?key=mia_pk_…</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="mi-app" style={style} ref={rootRef}>
      <header className="mi-app-head">
        <div className="mi-app-ava">{SPARK}</div>
        <div className="mi-app-ttl">
          <b>{title}</b>
          <span className="mi-app-sub">
            <span className="mi-app-pulse" />
            Online
          </span>
        </div>
      </header>

      <div className="mi-app-msgs" ref={msgsRef}>
        {messages.map((m) => (
          <div key={m.id} className={`mi-app-m ${m.role === "user" ? "mi-app-u" : "mi-app-a"}`}>
            {m.text}
          </div>
        ))}
        {typing && (
          <div className="mi-app-typing" aria-label="Assistant is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>

      {error && <div className="mi-app-err">{error}</div>}

      {showSugs && suggestions.length > 0 && (
        <div className="mi-app-sugs">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="mi-app-chip"
              disabled={busy}
              onClick={() => void submit(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="mi-app-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
      >
        <textarea
          ref={inputRef}
          className="mi-app-input"
          rows={1}
          value={input}
          placeholder="Message…"
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="on"
          disabled={busy}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(input);
            }
          }}
          aria-label="Message"
        />
        <button className="mi-app-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
          {SEND}
        </button>
      </form>
    </div>
  );
}
