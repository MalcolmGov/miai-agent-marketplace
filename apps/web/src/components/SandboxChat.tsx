"use client";

import { useState } from "react";
import { TopUpModal } from "./TopUpModal";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface WorkflowStep {
  id: string;
  label: string;
  tool?: string;
  status: string;
  resultSummary?: string;
}

interface WorkflowView {
  id: string;
  goal: string;
  status: string;
  steps: WorkflowStep[];
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
  const [workflow, setWorkflow] = useState<WorkflowView | null>(null);
  const [topUp, setTopUp] = useState(false);
  const [chatMode, setChatMode] = useState<"sandbox" | "live">(mode);
  const [clearing, setClearing] = useState(false);
  const isEA = /executive-assistant/i.test(agentId);
  const isIT = /it-helpdesk/i.test(agentId);
  const isBooking = /salon-booking|trades-receptionist|home-services/i.test(agentId);
  const isSales = /sales-qualifier/i.test(agentId);
  const isRestaurant = /restaurant-takeaway/i.test(agentId);
  const isOnboarding = /onboarding-buddy/i.test(agentId);

  async function clearChat() {
    if (busy || clearing) return;
    if (messages.length === 0 && !workflow && lastTools.length === 0) return;
    setClearing(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, clear: true }),
      });
      setMessages([]);
      setInput("");
      setLastTools([]);
      setWorkflow(null);
    } finally {
      setClearing(false);
    }
  }

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
      if (data.workflow) setWorkflow(data.workflow as WorkflowView);
      const reply = String(data.assistantMessage ?? "")
        .replace(/<!--miai-workflow:[\s\S]*?-->/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={busy || clearing || (messages.length === 0 && !workflow)}
            onClick={clearChat}
            title="Clear chat history and reset workflow state"
          >
            {clearing ? "Clearing…" : "Clear chat"}
          </button>
          {paused && (
            <button type="button" className="btn btn-primary text-xs" onClick={() => setTopUp(true)}>
              Top up to resume
            </button>
          )}
        </div>
      </div>
      {paused && (
        <div className="border-b border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-2 text-sm text-[var(--warn)]">
          Rental active — token balance empty. Top up tokens to resume.
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            {isEA
              ? "Try: “Schedule a 30-min budget review with Thabo tomorrow at 14:00, set a reminder, and notify the team.” · “Am I free Thursday afternoon?”"
              : isIT
                ? "Try: “How do I connect to the office VPN?” · “Laptop won’t power on — log a ticket for Thandi, ext 4412.” · “I clicked a phishing link.”"
                : isBooking
                  ? /salon/i.test(agentId)
                    ? "Try: “Can I get a men’s cut this Saturday?” · “Book the 10am skin fade with Riaan — Name’s Sipho, 555-0100.”"
                    : "Try: “Can I get an AC diagnostic this Thursday?” · “Book drain clearing Thursday 10:00 for Lea, +491701112233, Invalidenstr. 12 Berlin.”"
                  : isSales
                    ? "Try: “What does your Growth plan include and roughly what does it cost?” · “Call me Thursday afternoon on 555-0100 about Growth.” · “I’m Thabo from Nkosi Trading…”"
                    : isRestaurant
                      ? "Try: “What pizzas do you have and how much?” · “Order a Margherita and fries for collection — 555-0100.” · “Book a table for 2 on 2026-08-08 at 19:00.”"
                      : isOnboarding
                        ? "Try: “It’s my first day — what’s on my checklist?” · “Where do I submit banking for payroll?” · “Laptop won’t boot — I’m stuck.”"
                        : "Try: “Where is the Austin office?” · “How many PTO days do full-time employees get?” · “Speak to a human”"}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--accent-dim)]/30 text-[var(--text)]"
                : "bg-[var(--bg-elev)] text-[var(--text)]"
            }`}
          >
            {m.content}
          </div>
        ))}
        {workflow && (
          <div className="rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-xs">
            <div className="font-medium text-[var(--text)]">
              Workflow · {workflow.status}
            </div>
            <div className="mt-0.5 text-[var(--muted)]">{workflow.goal}</div>
            <ol className="mt-2 space-y-1">
              {workflow.steps.map((s) => (
                <li key={s.id} className="flex gap-2 text-[var(--text)]">
                  <span className="w-16 shrink-0 uppercase tracking-wide text-[var(--muted)]">
                    {s.status}
                  </span>
                  <span>
                    {s.label}
                    {s.tool ? (
                      <span className="text-[var(--muted)]"> · {s.tool}</span>
                    ) : null}
                    {s.resultSummary ? (
                      <span className="text-[var(--muted)]"> · {s.resultSummary}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {lastTools.length > 0 && (
          <div className="text-xs text-[var(--muted)]">Tools: {lastTools.join(", ")}</div>
        )}
      </div>
      <div className="flex gap-2 border-t border-[var(--line)] p-3">
        <input
          className="input"
          value={input}
          placeholder={
            paused
              ? "Top up to continue…"
              : (isEA || isIT || isBooking || isSales || isRestaurant || isOnboarding) &&
                  workflow?.status === "proposed"
                ? isIT || isOnboarding
                  ? "Yes, go ahead."
                  : isBooking
                    ? "Yes, please book it."
                    : isSales
                      ? "Please book the call."
                      : isRestaurant
                        ? "Yes, that's right — please book it."
                        : "Yes — please set it up…"
                : "Message the agent…"
          }
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
