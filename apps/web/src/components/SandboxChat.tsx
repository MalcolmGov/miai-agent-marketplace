"use client";

import { useState } from "react";
import { TopUpModal } from "./TopUpModal";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function SandboxChat({
  agentId,
  mode = "sandbox",
}: {
  agentId: string;
  mode?: "sandbox" | "live";
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastTools, setLastTools] = useState<string[]>([]);
  const [topUp, setTopUp] = useState(false);
  const [chatMode, setChatMode] = useState<"sandbox" | "live">(mode);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, message: text, mode: chatMode }),
      });
      const data = await res.json();
      setPaused(Boolean(data.paused));
      setBalance(data.balance ?? null);
      setLastTools((data.toolCalls ?? []).map((t: { name: string }) => t.name));
      const reply = String(data.assistantMessage ?? "").replace(/\*\*(.*?)\*\*/g, "$1");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <div className="text-sm font-medium">Agent chat</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <button
              type="button"
              className={`chip ${chatMode === "sandbox" ? "chip-live" : ""}`}
              onClick={() => setChatMode("sandbox")}
            >
              sandbox
            </button>
            <button
              type="button"
              className={`chip ${chatMode === "live" ? "chip-live" : ""}`}
              onClick={() => setChatMode("live")}
            >
              live (OAuth APIs)
            </button>
            {balance !== null ? ` · ${balance.toLocaleString()} tokens` : ""}
          </div>
        </div>
        {paused && (
          <button type="button" className="btn btn-primary text-xs" onClick={() => setTopUp(true)}>
            Top up to resume
          </button>
        )}
      </div>
      {paused && (
        <div className="border-b border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-2 text-sm text-[var(--warn)]">
          Rental active — token balance empty. Top up tokens to resume.
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Try: “Where is the Austin office?” · “How many PTO days do full-time employees get?” ·
            “Speak to a human”
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--accent-dim)]/30 text-[var(--text)]"
                : "bg-[var(--bg-elev)] text-[var(--text)]"
            }`}
          >
            {m.content}
          </div>
        ))}
        {lastTools.length > 0 && (
          <div className="text-xs text-[var(--muted)]">Tools: {lastTools.join(", ")}</div>
        )}
      </div>
      <div className="flex gap-2 border-t border-[var(--line)] p-3">
        <input
          className="input"
          value={input}
          placeholder={paused ? "Top up to continue…" : "Message the agent…"}
          disabled={busy || paused}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button type="button" className="btn btn-primary" disabled={busy || paused} onClick={send}>
          Send
        </button>
      </div>
      <TopUpModal
        open={topUp}
        onClose={() => setTopUp(false)}
        onDone={() => {
          setTopUp(false);
          setPaused(false);
        }}
      />
    </div>
  );
}
