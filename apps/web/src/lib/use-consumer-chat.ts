import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/chat-stream-client";

export type ChatMsg = { id: string; role: "user" | "assistant"; text: string };

type Options = {
  /** Tenant/workspace to scope wallet + memory to (the general assistant passes the brand id). */
  workspaceId: string;
  /** Agent to run; omit for the default consumer assistant. */
  agentId?: string;
  /** First assistant bubble shown before any exchange. */
  initialGreeting: string;
  /** Fired (once per turn) after the assistant actually replied — e.g. offer the daily brief. */
  onReplied?: () => void;
  /** Fired in the turn's `finally`, after wallet refresh — e.g. reload reminders. */
  onSettled?: () => void;
  /** Fired at the very start of a submit — e.g. dismiss the one-time welcome. */
  onSubmitStart?: () => void;
};

/**
 * The consumer chat loop, shared by the general assistant (/me) and the specialist pages
 * (/personal/[id]). Owns the message list, prepaid-balance readout, streaming turn and the
 * per-turn lifecycle; callers layer their own chrome (connectors, brand switcher, hero…) around it.
 *
 * Callbacks are held in a ref so `submit` stays referentially stable across renders even when the
 * caller passes fresh inline closures.
 */
export function useConsumerChat({
  workspaceId,
  agentId,
  initialGreeting,
  onReplied,
  onSettled,
  onSubmitStart,
}: Options) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "greet", role: "assistant", text: initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showSugs, setShowSugs] = useState(true);
  const sessionId = useRef(crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const ws = `?workspaceId=${encodeURIComponent(workspaceId)}`;

  const cbRef = useRef({ onReplied, onSettled, onSubmitStart });
  cbRef.current = { onReplied, onSettled, onSubmitStart };

  const loadWallet = useCallback(() => {
    fetch(`/api/consumer/wallet${ws}`)
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  const submit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setShowSugs(false);
      cbRef.current.onSubmitStart?.();
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

      // One idempotency key per distinct send. The busy-guard above blocks a double-fire, so each
      // send gets a fresh key (charged), while an infra/network replay of THIS request carries the
      // same key and dedups. If a client-side retry is ever added, it must reuse this same value.
      const idempotencyKey = crypto.randomUUID();

      let replied = false;
      try {
        let started = false;
        await streamChat(
          `/api/consumer/chat${ws}`,
          { message: text, sessionId: sessionId.current, agentId, idempotencyKey },
          (ev) => {
            if (ev.type === "tool") {
              setTyping(true);
            } else if (ev.type === "delta") {
              appendChunk(ev.text, started);
              started = true;
              replied = true;
            } else {
              // paused | done
              if (typeof ev.balance === "number") setBalance(ev.balance);
              if (!started && ev.reply) {
                appendChunk(ev.reply, false);
                started = true;
                replied = true;
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
        cbRef.current.onSettled?.();
        if (replied) cbRef.current.onReplied?.();
      }
    },
    [busy, ws, agentId, loadWallet],
  );

  /** Reset to a clean conversation (new session id + greeting) — used when the caller switches context. */
  const resetConversation = useCallback((greeting: string) => {
    sessionId.current = crypto.randomUUID();
    setMessages([{ id: "greet", role: "assistant", text: greeting }]);
    setShowSugs(true);
    setError(null);
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    busy,
    typing,
    error,
    setError,
    balance,
    showSugs,
    setShowSugs,
    scrollRef,
    loadWallet,
    submit,
    resetConversation,
  };
}

export type ConsumerChat = ReturnType<typeof useConsumerChat>;
