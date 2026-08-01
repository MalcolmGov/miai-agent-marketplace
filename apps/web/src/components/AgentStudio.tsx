"use client";

import { KnowledgePanel } from "./KnowledgePanel";
import { ActionsPanel } from "./ActionsPanel";
import { SandboxChat } from "./SandboxChat";
import {
  SetupGuide,
  readSetupFlag,
  rentalStatusLabel,
  writeSetupFlag,
  type StudioTab,
} from "./SetupGuide";
import { MODELS } from "@/lib/models";
import { TIER_PRICES } from "@/lib/constants";
import {
  isWorkflowFamilyId,
  workflowCapabilityChips,
  workflowDemoHint,
} from "@/lib/workflows";
import { useEffect, useMemo, useState } from "react";

interface AgentPayload {
  package: {
    manifest: {
      id: string;
      name: string;
      tier: keyof typeof TIER_PRICES;
      summary: string;
      channels: string[];
      market?: string;
      model: { primary: string };
    };
    tools: Array<{ name: string; description: string; side_effects?: string }>;
    knowledge: string;
  };
  rentUsd: number;
  pilot: boolean;
  rental: {
    state: string;
    model: string;
    knowledge: string;
    publicKey: string;
    connectedConnectors: string[];
    tier: keyof typeof TIER_PRICES;
  } | null;
  connectors: Array<{
    id: string;
    name: string;
    phase: number;
    description: string;
    recommended?: boolean;
  }>;
}

export function AgentStudio({ agentId }: { agentId: string }) {
  const [data, setData] = useState<AgentPayload | null>(null);
  const [model, setModel] = useState("claude-sonnet");
  const [knowledge, setKnowledge] = useState("");
  const [tier, setTier] = useState<keyof typeof TIER_PRICES>("standard");
  const [publicKey, setPublicKey] = useState("");
  const [state, setState] = useState("selected");
  const [connected, setConnected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<StudioTab>("configure");
  const [triedChat, setTriedChat] = useState(false);
  const [visitedInstall, setVisitedInstall] = useState(false);
  const [skippedConnect, setSkippedConnect] = useState(false);

  const hasWorkflow = isWorkflowFamilyId(agentId);

  async function load() {
    const res = await fetch(`/api/agents/${agentId}`);
    const json = (await res.json()) as AgentPayload;
    setData(json);
    setModel(json.rental?.model ?? json.package.manifest.model.primary);
    setKnowledge(json.rental?.knowledge ?? json.package.knowledge);
    setTier(json.rental?.tier ?? json.package.manifest.tier);
    setPublicKey(json.rental?.publicKey ?? "");
    setState(json.rental?.state ?? "selected");
    setConnected(json.rental?.connectedConnectors ?? []);
  }

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "actions" || t === "install" || t === "configure") setTab(t);
    setTriedChat(readSetupFlag(agentId, "tried"));
    setVisitedInstall(readSetupFlag(agentId, "install"));
    setSkippedConnect(readSetupFlag(agentId, "skip-connect"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when agent route changes
  }, [agentId]);

  useEffect(() => {
    if (tab === "install") {
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
    }
  }, [tab, agentId]);

  const snippet = useMemo(() => {
    const key = publicKey || `mia_pk_${agentId}_demo`;
    return `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/agents/v1/agent.js" data-key="${key}" async></script>`;
  }, [publicKey, agentId]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setConfigMsg({ kind: "err", text: "Could not copy — select the snippet and copy manually." });
    }
  }

  /** Ensure workspace entitlement exists (survives “selected” and post-redeploy memory wipe). */
  async function ensureRented(): Promise<boolean> {
    if (state !== "selected" && publicKey) return true;
    const res = await fetch("/api/rent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, tier }),
    });
    const json = await res.json();
    if (!res.ok) {
      setConfigMsg({ kind: "err", text: json.error ?? "Could not create rental" });
      return false;
    }
    setPublicKey(json.rental.publicKey);
    setState(json.rental.state);
    return true;
  }

  async function rent() {
    setSaving(true);
    setConfigMsg(null);
    try {
      const ok = await ensureRented();
      if (!ok) return;
      setTab("configure");
      setConfigMsg({
        kind: "ok",
        text: "Rented — next: review knowledge, then Save & continue.",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig(markRented = false) {
    setSaving(true);
    setConfigMsg(null);
    try {
      if (!(await ensureRented())) return;

      const res = await fetch("/api/configure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId,
          model,
          knowledge,
          connectedConnectors: connected,
          markRented,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setConfigMsg({ kind: "err", text: json.error ?? "Save failed" });
        return;
      }
      if (json.rental) {
        setState(json.rental.state);
        setPublicKey(json.rental.publicKey);
      }
      setConfigMsg({
        kind: "ok",
        text: markRented
          ? hasWorkflow
            ? "Saved — next: connect Calendar and Slack (or skip for sandbox)."
            : "Saved — next: try the agent in chat."
          : "Draft saved.",
      });
      if (markRented) setTab("actions");
    } finally {
      setSaving(false);
    }
  }

  function goTab(next: StudioTab) {
    setTab(next);
  }

  function focusChat() {
    document.getElementById("agent-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function markTried() {
    writeSetupFlag(agentId, "tried");
    setTriedChat(true);
  }

  function skipConnect() {
    writeSetupFlag(agentId, "skip-connect");
    setSkippedConnect(true);
    focusChat();
  }

  if (!data) {
    return <div className="text-[var(--muted)]">Loading agent…</div>;
  }

  const m = data.package.manifest;
  const demoHint = workflowDemoHint(agentId);
  const capabilityChips = workflowCapabilityChips(agentId);
  const rented = state !== "selected";
  const hasKnowledge = knowledge.trim().length > 0;
  const toolsConnected = hasWorkflow
    ? connected.some((id) => id === "google_calendar" || id === "slack" || id === "calendar")
    : connected.length > 0 || data.connectors.some((c) => c.recommended && connected.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {hasWorkflow && (
              <span className="chip chip-live" title="Goal → plan → confirm → execute → verify">
                Multi-step agent
              </span>
            )}
            <span className="chip">{m.tier}</span>
            <span className="chip">{(m.market ?? "za").toUpperCase()}</span>
            <span className={`chip ${rented ? "chip-live" : ""}`}>{rentalStatusLabel(state)}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{m.summary}</p>
          {hasWorkflow ? (
            <>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text)]">
                Multi-step workflow: proposes a plan, waits for your confirm, then runs tools.{" "}
                {demoHint ?? "Connect Calendar / Slack on Actions, then try a prompt in chat."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="What this agent can do">
                {capabilityChips.map((label) => (
                  <span
                    key={label}
                    className={`chip normal-case tracking-normal ${
                      label === "Can act" ||
                      label === "Multi-step" ||
                      label === "Confirm before write"
                        ? "chip-live"
                        : ""
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="panel flex flex-col gap-2 p-4 sm:min-w-[240px]">
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Rent</div>
          <div className="flex gap-2">
            {(Object.keys(TIER_PRICES) as Array<keyof typeof TIER_PRICES>).map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${tier === t ? "chip-live" : ""}`}
                onClick={() => setTier(t)}
              >
                {t} ${TIER_PRICES[t]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary mt-1" disabled={saving} onClick={rent}>
            {state === "selected" ? "Rent & configure" : "Update plan"}
          </button>
        </div>
      </div>

      <SetupGuide
        agentId={agentId}
        isWorkflow={hasWorkflow}
        rented={rented}
        hasKnowledge={hasKnowledge}
        toolsConnected={toolsConnected}
        triedChat={triedChat}
        visitedInstall={visitedInstall}
        skippedConnect={skippedConnect}
        onGoTab={goTab}
        onFocusChat={focusChat}
        onSkipConnect={skipConnect}
        onRent={() => void rent()}
      />

      <div className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-2">
        {(
          [
            ["configure", "Configure"],
            ["actions", "Actions"],
            ["install", "Install"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn ${tab === id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => goTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {tab === "configure" && (
            <>
              <div className="panel p-4">
                <h2 className="mb-3 text-sm font-semibold">Model</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {MODELS.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setModel(mod.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                        model === mod.id
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                          : "border-[var(--line)]"
                      }`}
                    >
                      <div className="font-medium">{mod.label}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {mod.blurb} · burn {mod.burn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <KnowledgePanel
                agentId={agentId}
                knowledge={knowledge}
                onKnowledgeChange={setKnowledge}
                saving={saving}
                onSaveDraft={() => void saveConfig(false)}
                onMarkReady={() => void saveConfig(true)}
                configMsg={configMsg}
                showSelectedTip={state === "selected"}
              />
            </>
          )}

          {tab === "actions" && (
            <ActionsPanel
              agentId={agentId}
              connectors={data.connectors}
              connected={connected}
              onConnected={(ids) => setConnected(ids)}
            />
          )}

          {tab === "install" && (
            <div className="panel space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Web embed</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Paste before <code>&lt;/body&gt;</code>. Key:{" "}
                    <code className="text-[var(--accent)]">{publicKey || "rent to mint"}</code>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  onClick={() => void copySnippet()}
                >
                  {copied ? "Copied ✓" : "Copy snippet"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-[#0d1219] p-3 text-xs text-[var(--accent)]">
                {snippet}
              </pre>
              <div className="space-y-2 text-sm text-[var(--muted)]">
                <p>
                  <strong className="text-[var(--text)]">WordPress:</strong> Appearance → Theme File
                  Editor → footer.php, or a header/footer plugin HTML block.
                </p>
                <p>
                  <strong className="text-[var(--text)]">Shopify:</strong> Online Store → Themes →
                  Edit code → theme.liquid before <code>&lt;/body&gt;</code>.
                </p>
                <p>
                  <strong className="text-[var(--text)]">Wix:</strong> Settings → Custom Code → Body
                  end → paste snippet.
                </p>
                <p>
                  <strong className="text-[var(--text)]">WhatsApp:</strong> Assign a Cloud API number
                  in Channels once WABA ownership is confirmed (see PLATFORM_INTEGRATION.md).
                </p>
              </div>
            </div>
          )}

          <details className="panel p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Tools ({data.package.tools.length})
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {data.package.tools.map((t) => (
                <li key={t.name} className="border-b border-[var(--line)] pb-2 last:border-0">
                  <code className="text-[var(--accent)]">{t.name}</code>
                  {t.side_effects && <span className="chip ml-2">{t.side_effects}</span>}
                  <p className="text-xs text-[var(--muted)]">{t.description}</p>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <SandboxChat agentId={agentId} mode="sandbox" onFirstMessage={markTried} />
      </div>
    </div>
  );
}
