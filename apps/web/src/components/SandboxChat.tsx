"use client";

import { useEffect, useState } from "react";
import {
  CHAT_LANGUAGES,
  chatLangStorageKey,
  defaultChatLanguage,
  isChatLanguage,
  suggestedLanguagesForAgent,
  type ChatLanguageCode,
} from "@/lib/chat-languages";
import {
  toolChipLabel,
  tryPromptsForAgent,
  workflowCapabilityChips,
} from "@/lib/workflows";
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
  freeTry = false,
  highlightTry = false,
  onFirstMessage,
}: {
  agentId: string;
  mode?: "sandbox" | "live";
  /** Agent not yet rented — turns are free. */
  freeTry?: boolean;
  /** Came from catalogue Try CTA. */
  highlightTry?: boolean;
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
  const [replyLanguage, setReplyLanguage] = useState<ChatLanguageCode>(() =>
    defaultChatLanguage(agentId),
  );
  const suggestedLangs = suggestedLanguagesForAgent(agentId);
  const { workflow: isWorkflowAgent, prompts } = tryPromptsForAgent(agentId);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(chatLangStorageKey(agentId));
      if (isChatLanguage(saved)) {
        setReplyLanguage(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setReplyLanguage(defaultChatLanguage(agentId));
  }, [agentId]);

  function changeReplyLanguage(next: ChatLanguageCode) {
    setReplyLanguage(next);
    try {
      window.localStorage.setItem(chatLangStorageKey(agentId), next);
    } catch {
      /* ignore */
    }
  }
  const capabilityChips = workflowCapabilityChips(agentId);
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
        body: JSON.stringify({
          agentId,
          message: text,
          mode: chatMode,
          replyLanguage,
        }),
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
    <div id="agent-chat" className="studio-chat-panel panel flex flex-col overflow-hidden scroll-mt-24">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Agent chat</span>
              {capabilityChips.length > 0 ? (
                <span
                  className="chip chip-live"
                  title="Goal → plan → confirm → execute → verify"
                >
                  Multi-step agent
                </span>
              ) : null}
              {freeTry ? (
                <span className="chip" title="No wallet debit until you rent">
                  Free try
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <div role="group" aria-label="Chat mode" className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  aria-pressed={chatMode === "sandbox"}
                  className={`chip transition ${
                    chatMode === "sandbox"
                      ? "chip-live font-medium shadow-sm"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  onClick={() => setChatMode("sandbox")}
                >
                  {chatMode === "sandbox" && (
                    <span aria-hidden className="mr-1 font-bold text-[var(--accent)]">
                      ✓
                    </span>
                  )}
                  sandbox
                </button>
                <button
                  type="button"
                  aria-pressed={chatMode === "live"}
                  className={`chip transition ${
                    chatMode === "live"
                      ? "chip-live font-medium shadow-sm"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  onClick={() => setChatMode("live")}
                >
                  {chatMode === "live" && (
                    <span aria-hidden className="mr-1 font-bold text-[var(--accent)]">
                      ✓
                    </span>
                  )}
                  live (OAuth APIs)
                </button>
              </div>
              <label className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--bg-elev)] px-2 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-dim)]">
                  Reply in
                </span>
                <select
                  className="max-w-[9.5rem] bg-transparent text-xs font-semibold text-[var(--text)] outline-none"
                  value={replyLanguage}
                  aria-label="Agent reply language"
                  title="Language the agent should reply in"
                  onChange={(e) => changeReplyLanguage(e.target.value as ChatLanguageCode)}
                >
                  {CHAT_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native}
                      {suggestedLangs.includes(lang.code) ? " · pack" : ""}
                    </option>
                  ))}
                </select>
              </label>
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
        {(freeTry || highlightTry) && (
          <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-2 text-xs text-[var(--text)]">
            Free sandbox try — activate (free) to go live on your website or app. No tokens charged
            until you go live.
          </p>
        )}
        {capabilityChips.length > 0 ? (
          <div
            className="mt-2.5 flex flex-wrap gap-1.5"
            aria-label="What this agent can do"
          >
            {capabilityChips.map((label) => (
              <span
                key={label}
                className={`chip normal-case tracking-normal ${
                  label === "Can act" || label === "Multi-step" || label === "Confirm before write"
                    ? "chip-live"
                    : ""
                }`}
                title={
                  label === "Confirm before write"
                    ? "Proposes a plan and waits for your yes before writing"
                    : label === "Can act"
                      ? "Runs tools — books, tickets, notifies — not FAQ-only"
                      : undefined
                }
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {paused && (
        <div className="border-b border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_12%,transparent)] px-4 py-2 text-sm text-[var(--warn)]">
          Rental active — token balance empty. Top up tokens to resume.
        </div>
      )}
      <div className="studio-chat-thread flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-4 text-sm text-[var(--muted)]">
            <div className="space-y-2">
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
                    className="suggestion disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isYou = m.role === "user";
          return (
            <div
              key={i}
              className={`studio-chat-row ${isYou ? "studio-chat-row-you" : "studio-chat-row-agent"}`}
            >
              {!isYou ? (
                <div className="studio-chat-avatar studio-chat-avatar-agent" aria-hidden>
                  A
                </div>
              ) : null}
              <div className={`studio-chat-col ${isYou ? "studio-chat-col-you" : ""}`}>
                <div className="studio-chat-meta">
                  {isYou ? "You · customer" : "Agent"}
                </div>
                <div
                  className={`studio-chat-bubble ${
                    isYou ? "studio-chat-bubble-you" : "studio-chat-bubble-agent"
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {isYou ? (
                <div className="studio-chat-avatar studio-chat-avatar-you" aria-hidden>
                  Y
                </div>
              ) : null}
            </div>
          );
        })}
        {busy ? (
          <div className="studio-chat-row studio-chat-row-agent" aria-live="polite" aria-label="Agent is typing">
            <div className="studio-chat-avatar studio-chat-avatar-agent" aria-hidden>
              A
            </div>
            <div className="studio-chat-col">
              <div className="studio-chat-meta">Agent</div>
              <div className="studio-chat-bubble studio-chat-bubble-agent studio-chat-typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        ) : null}
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
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Actions just taken">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-dim)]">
              Acted
            </span>
            {lastTools.map((t) => (
              <span key={t} className="chip chip-live normal-case tracking-normal">
                {toolChipLabel(t)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 border-t border-[var(--line)] p-3">
        <input
          id="sandbox-chat-input"
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
