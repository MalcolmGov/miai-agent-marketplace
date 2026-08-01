"use client";

import { useState } from "react";
import { tryPromptsForAgent } from "@/lib/workflows";
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
  onFirstMessage,
}: {
  agentId: string;
  mode?: "sandbox" | "live";
  onFirstMessage?: () => void;
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
  const { workflow: isWorkflowAgent, prompts } = tryPromptsForAgent(agentId);
  const isEA = /executive-assistant/i.test(agentId);
  const isIT = /it-helpdesk/i.test(agentId);
  const isBooking = /salon-booking|trades-receptionist|home-services/i.test(agentId);
  const isSales = /sales-qualifier/i.test(agentId);
  const isRestaurant = /restaurant-takeaway/i.test(agentId);
  const isOnboarding = /onboarding-buddy/i.test(agentId);
  const isDental = /dental-front-desk/i.test(agentId);
  const isHotel = /hotel-guest/i.test(agentId);
  const hasWorkflowUi =
    isEA ||
    isIT ||
    isBooking ||
    isSales ||
    isRestaurant ||
    isOnboarding ||
    isDental ||
    isHotel ||
    isWorkflowAgent;

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

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    if (!textOverride) setInput("");
    else setInput("");
    const wasEmpty = messages.length === 0;
    setMessages((m) => [...m, { role: "user", content: text }]);
    if (wasEmpty) onFirstMessage?.();
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
    <div id="agent-chat" className="panel flex h-[520px] flex-col overflow-hidden scroll-mt-24">
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
          <div className="space-y-2 text-sm text-[var(--muted)]">
            {hasWorkflowUi ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                Multi-step workflow — try:
              </p>
            ) : (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Try a prompt:
              </p>
            )}
            <div className="flex flex-col gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy || paused}
                  onClick={() => void send(p)}
                  className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2 text-left text-sm text-[var(--text)] transition hover:border-[color-mix(in_srgb,var(--accent)_40%,transparent)] hover:text-[var(--accent-bright)] disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
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
              : hasWorkflowUi && workflow?.status === "proposed"
                ? isIT || isOnboarding
                  ? "Yes, go ahead."
                  : isBooking || isDental
                    ? "Yes, please book it."
                    : isSales
                      ? "Please book the call."
                      : isRestaurant
                        ? "Yes, that's right — please book it."
                        : isHotel
                          ? "Yes, please log it."
                          : "Yes — please set it up…"
                : "Message the agent…"
          }
          disabled={busy || paused}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || paused}
          onClick={() => void send()}
        >
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
