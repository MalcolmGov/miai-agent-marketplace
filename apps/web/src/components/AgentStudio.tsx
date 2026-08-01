"use client";

import { KnowledgePanel } from "./KnowledgePanel";
import { ActionsPanel } from "./ActionsPanel";
import { InstallPanel } from "./InstallPanel";
import { SandboxChat } from "./SandboxChat";
import {
  SetupGuide,
  readSetupFlag,
  writeSetupFlag,
  type StudioTab,
} from "./SetupGuide";
import { useT } from "@/lib/locale";
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

function rentalStatusKey(state: string): "studio.statusNotRented" | "studio.statusDraft" | "studio.statusReady" {
  if (state === "selected") return "studio.statusNotRented";
  if (state === "configuring") return "studio.statusDraft";
  if (state === "rented" || state === "live" || state === "paused") return "studio.statusReady";
  return "studio.statusNotRented";
}

export function AgentStudio({ agentId }: { agentId: string }) {
  const t = useT();
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
  const [copiedApp, setCopiedApp] = useState(false);
  const [appTitle, setAppTitle] = useState("Assistant");
  const [appAccent, setAppAccent] = useState("#2bb8a8");
  const [appAccent2, setAppAccent2] = useState("#157f8d");
  const [appGreeting, setAppGreeting] = useState(
    "Hi! I'm your AI assistant. Ask me anything, or say you'd like a human.",
  );
  const [tab, setTab] = useState<StudioTab>("configure");
  const [triedChat, setTriedChat] = useState(false);
  const [visitedInstall, setVisitedInstall] = useState(false);
  const [skippedConnect, setSkippedConnect] = useState(false);
  const [tryMode, setTryMode] = useState(false);

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
    const wantTry = params.get("try") === "1";
    setTryMode(wantTry);
    setTriedChat(readSetupFlag(agentId, "tried"));
    setVisitedInstall(readSetupFlag(agentId, "install"));
    setSkippedConnect(readSetupFlag(agentId, "skip-connect"));
    if (wantTry) {
      window.setTimeout(() => {
        document.getElementById("agent-chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("sandbox-chat-input")?.focus();
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when agent route changes
  }, [agentId]);

  useEffect(() => {
    if (tab === "install") {
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
    }
  }, [tab, agentId]);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const snippet = useMemo(() => {
    const key = publicKey || `mia_pk_${agentId}_demo`;
    const base = origin || "";
    return `<script src="${base}/agents/v1/agent.js" data-key="${key}" async></script>`;
  }, [publicKey, agentId, origin]);

  const appUrl = useMemo(() => {
    const key = publicKey || `mia_pk_${agentId}_demo`;
    const q = new URLSearchParams({
      key,
      title: appTitle,
      accent: appAccent,
      accent2: appAccent2,
      greeting: appGreeting,
    });
    return `${origin || ""}/app/v1?${q.toString()}`;
  }, [publicKey, agentId, origin, appTitle, appAccent, appAccent2, appGreeting]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setConfigMsg({ kind: "err", text: t("studio.errorCopy") });
    }
  }

  async function copyAppUrl() {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedApp(true);
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
      window.setTimeout(() => setCopiedApp(false), 2000);
    } catch {
      setConfigMsg({ kind: "err", text: t("studio.errorCopy") });
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
      setConfigMsg({ kind: "err", text: json.error ?? t("studio.errorRental") });
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
        text: t("studio.okRented"),
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
        setConfigMsg({ kind: "err", text: json.error ?? t("studio.errorSave") });
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
            ? t("studio.okSavedWorkflow")
            : t("studio.okSavedChat")
          : t("studio.okDraft"),
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
    return <div className="text-[var(--muted)]">{t("studio.loading")}</div>;
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
              <span className="chip chip-live" title={t("studio.multiStepTitle")}>
                {t("studio.multiStepAgent")}
              </span>
            )}
            <span className="chip">{m.tier}</span>
            <span className="chip">{(m.market ?? "za").toUpperCase()}</span>
            <span className={`chip ${rented ? "chip-live" : ""}`}>
              {t(rentalStatusKey(state))}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{m.summary}</p>
          {hasWorkflow ? (
            <>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text)]">
                {t("studio.multiStepWorkflow")}{" "}
                {demoHint ?? "Connect Calendar / Slack on Actions, then try a prompt in chat."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("studio.capabilitiesAria")}>
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
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{t("studio.rent")}</div>
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
            {state === "selected" ? t("studio.rentConfigure") : t("studio.updatePlan")}
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
            ["configure", "studio.tabConfigure"],
            ["actions", "studio.tabActions"],
            ["install", "studio.tabInstall"],
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            className={`btn ${tab === id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => goTab(id)}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {tab === "configure" && (
            <>
              <div className="panel p-4">
                <h2 className="mb-3 text-sm font-semibold">{t("studio.model")}</h2>
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
                        {mod.blurb} · {t("studio.modelBurn", { burn: mod.burn })}
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
            <InstallPanel
              ready={Boolean(publicKey) && state !== "selected"}
              publicKey={publicKey}
              snippet={snippet}
              appUrl={appUrl}
              appTitle={appTitle}
              appGreeting={appGreeting}
              appAccent={appAccent}
              appAccent2={appAccent2}
              onAppTitle={setAppTitle}
              onAppGreeting={setAppGreeting}
              onAppAccent={setAppAccent}
              onAppAccent2={setAppAccent2}
              copied={copied}
              copiedApp={copiedApp}
              onCopySnippet={() => void copySnippet()}
              onCopyAppUrl={() => void copyAppUrl()}
              onRent={() => void rent()}
            />
          )}

          <details className="panel p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("studio.tools", { count: data.package.tools.length })}
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

        <SandboxChat
          agentId={agentId}
          mode="sandbox"
          freeTry={state === "selected"}
          highlightTry={tryMode}
          onFirstMessage={markTried}
        />
      </div>
    </div>
  );
}
