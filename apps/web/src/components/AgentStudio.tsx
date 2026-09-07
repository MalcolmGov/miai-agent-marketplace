"use client";

import Link from "next/link";
import { KnowledgePanel } from "./KnowledgePanel";
import { ActionsPanel } from "./ActionsPanel";
import { InstallPanel } from "./InstallPanel";
import { TokenTopUpPanel } from "./TokenTopUpPanel";
import { SandboxChat } from "./SandboxChat";
import {
  SetupGuide,
  readSetupFlag,
  writeSetupFlag,
  isSetupStepId,
  resolveSetupStep,
  type SetupStepId,
} from "./SetupGuide";
import { useT } from "@/lib/locale";
import { MODELS } from "@/lib/models";
import { TIER_PRICES } from "@/lib/constants";
import {
  isWorkflowFamilyId,
  workflowCapabilityChips,
  workflowDemoHint,
} from "@/lib/workflows";
import { buildEmbedScriptTag } from "@/lib/agent-js-script";
import { useEffect, useMemo, useState } from "react";

function marketFlag(market?: string) {
  if (market === "us") return "🇺🇸 United States";
  if (market === "eu") return "🇪🇺 European Union";
  if (market === "africa" || market === "za") return "🌍 Africa";
  if (market === "asia") return "🌏 Asia";
  if (market === "oceania") return "🇦🇺 Oceania";
  return "🌍 Global";
}

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
    approvedDomains?: string[];
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

function stepFromUrl(): SetupStepId | null {
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  if (isSetupStepId(step)) return step;
  if (step === "rent") return "tokens"; // back-compat: the old rent step is now tokens
  const tab = params.get("tab");
  if (tab === "actions") return "connect";
  if (tab === "install") return "install";
  if (tab === "configure") return "knowledge";
  if (params.get("try") === "1") return "try";
  return null;
}

export function AgentStudio({
  agentId,
  scriptIntegrity,
}: {
  agentId: string;
  scriptIntegrity: string;
}) {
  const t = useT();
  const [data, setData] = useState<AgentPayload | null>(null);
  const [model, setModel] = useState("claude-sonnet");
  const [knowledge, setKnowledge] = useState("");
  const [tier, setTier] = useState<keyof typeof TIER_PRICES>("standard");
  const [publicKey, setPublicKey] = useState("");
  const [state, setState] = useState("selected");
  const [connected, setConnected] = useState<string[]>([]);
  const [rentReadiness, setRentReadiness] = useState<{
    ready: boolean;
    missing: { connector: string; name: string; tools: string[] }[];
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedApp, setCopiedApp] = useState(false);
  const [appTitle, setAppTitle] = useState("Assistant");
  const [appAccent, setAppAccent] = useState("#2bb8a8");
  const [appAccent2, setAppAccent2] = useState("#157f8d");
  const [appGreeting, setAppGreeting] = useState(
    "Hi — I'm an AI assistant (not a human). Ask me anything, or say you'd like a human.",
  );
  const [activeStep, setActiveStep] = useState<SetupStepId>("knowledge");
  const [triedChat, setTriedChat] = useState(false);
  const [visitedInstall, setVisitedInstall] = useState(false);
  const [skippedConnect, setSkippedConnect] = useState(false);
  const [knowledgeConfirmed, setKnowledgeConfirmed] = useState(false);
  const [tryMode, setTryMode] = useState(false);
  const [flagsReady, setFlagsReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [balanceTokens, setBalanceTokens] = useState<number | null>(null);
  const [approvedDomains, setApprovedDomains] = useState<string[]>([]);
  const [savingDomains, setSavingDomains] = useState(false);
  const [domainsMsg, setDomainsMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
    setApprovedDomains(json.rental?.approvedDomains ?? []);
  }

  /** Set the embed origin lock. Empty = unlocked (anyone with the public key can use the agent). */
  async function saveDomains(domains: string[]) {
    setSavingDomains(true);
    setDomainsMsg(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/domains`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domains }),
      });
      const json = (await res.json().catch(() => ({}))) as { approvedDomains?: string[]; error?: string };
      if (!res.ok) throw new Error(json.error || "save failed");
      setApprovedDomains(Array.isArray(json.approvedDomains) ? json.approvedDomains : domains);
      setDomainsMsg({ kind: "ok", text: t("install.lockSaved") });
    } catch {
      setDomainsMsg({ kind: "err", text: t("install.lockError") });
    } finally {
      setSavingDomains(false);
    }
  }

  async function loadBalance() {
    try {
      const res = await fetch("/api/wallet");
      if (res.ok) {
        const json = await res.json();
        setBalanceTokens(typeof json.tokens === "number" ? json.tokens : null);
      }
    } catch {
      /* wallet read is best-effort — the tokens step still renders */
    }
  }

  useEffect(() => {
    void load();
    void loadBalance();
    const wantTry = new URLSearchParams(window.location.search).get("try") === "1";
    setTryMode(wantTry);
    setTriedChat(readSetupFlag(agentId, "tried"));
    setVisitedInstall(readSetupFlag(agentId, "install"));
    setSkippedConnect(readSetupFlag(agentId, "skip-connect"));
    setKnowledgeConfirmed(readSetupFlag(agentId, "knowledge"));
    setFlagsReady(true);
    const fromUrl = stepFromUrl();
    if (fromUrl) {
      setActiveStep(fromUrl);
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when agent route changes
  }, [agentId]);

  // Resolve first incomplete step once agent + flags are loaded (unless URL forced a step)
  useEffect(() => {
    if (!data || !flagsReady || hydrated) return;
    if (stepFromUrl()) {
      setHydrated(true);
      return;
    }
    const connectedNow = data.rental?.connectedConnectors ?? [];
    const toolsOk = hasWorkflow
      ? connectedNow.some((id) => id === "google_calendar" || id === "slack" || id === "calendar")
      : connectedNow.length > 0;
    setActiveStep(
      resolveSetupStep({
        hasKnowledge: readSetupFlag(agentId, "knowledge"),
        connectDone: toolsOk || readSetupFlag(agentId, "skip-connect"),
        hasTokens: (balanceTokens ?? 0) > 0,
        triedChat: readSetupFlag(agentId, "tried"),
        visitedInstall: readSetupFlag(agentId, "install"),
      }),
    );
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.package.manifest.id, flagsReady, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (activeStep === "install") {
      writeSetupFlag(agentId, "install");
      setVisitedInstall(true);
    }
    const url = new URL(window.location.href);
    url.searchParams.set("step", activeStep);
    url.searchParams.delete("tab");
    if (activeStep !== "try") url.searchParams.delete("try");
    window.history.replaceState({}, "", url.toString());
  }, [activeStep, agentId, hydrated]);

  useEffect(() => {
    if (activeStep === "try") {
      window.setTimeout(() => {
        document.getElementById("sandbox-chat-input")?.focus();
      }, 200);
    }
  }, [activeStep]);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const snippet = useMemo(() => {
    // Demo keys only in local/dev — production requires a real activated publicKey.
    const allowDemo = process.env.NODE_ENV !== "production";
    const key = publicKey || (allowDemo ? `mia_pk_${agentId}_demo` : "");
    if (!key) {
      return `<!-- Activate this agent (free) to get an embed key, then paste the Install snippet. -->`;
    }
    const base = origin || "";
    return buildEmbedScriptTag({
      src: `${base}/agents/v1/agent.js`,
      key,
      integrity: scriptIntegrity,
    });
  }, [publicKey, agentId, origin, scriptIntegrity]);

  const appUrl = useMemo(() => {
    const allowDemo = process.env.NODE_ENV !== "production";
    const key = publicKey || (allowDemo ? `mia_pk_${agentId}_demo` : "");
    if (!key) return `${origin || ""}/app/v1`;
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
    // P0-6: surface which connectors this agent needs so the connect step can guide the user.
    setRentReadiness(json.readiness ?? null);
    return true;
  }

  // Activation is free now (no rental/subscription) — create the workspace record +
  // embed key so the agent can go live. Tokens are bought separately (Paystack).
  async function activate(): Promise<boolean> {
    setSaving(true);
    setConfigMsg(null);
    try {
      const ok = await ensureRented();
      if (!ok) return false;
      setConfigMsg({ kind: "ok", text: t("studio.okRented") });
      await load();
      return true;
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
      if (markRented) setActiveStep("connect");
      writeSetupFlag(agentId, "knowledge");
      setKnowledgeConfirmed(true);
    } finally {
      setSaving(false);
    }
  }

  function markTried() {
    writeSetupFlag(agentId, "tried");
    setTriedChat(true);
  }

  function skipConnect() {
    writeSetupFlag(agentId, "skip-connect");
    setSkippedConnect(true);
    setActiveStep("try");
  }

  function confirmKnowledge() {
    writeSetupFlag(agentId, "knowledge");
    setKnowledgeConfirmed(true);
  }

  function goStep(step: SetupStepId) {
    setActiveStep(step);
  }

  if (!data) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t("studio.loading")}>
        <div className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-3 w-64" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="panel space-y-3 p-5">
              <div className="skeleton h-5 w-36" />
              <div className="skeleton h-32 w-full" />
            </div>
            <div className="panel space-y-3 p-5">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-24 w-full" />
            </div>
          </div>
          <div className="panel space-y-3 p-5">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const m = data.package.manifest;
  const demoHint = workflowDemoHint(agentId);
  const capabilityChips = workflowCapabilityChips(agentId);
  const rented = state !== "selected";
  const hasKnowledge = knowledgeConfirmed && knowledge.trim().length > 0;
  const toolsConnected = hasWorkflow
    ? connected.some((id) => id === "google_calendar" || id === "slack" || id === "calendar")
    : connected.length > 0 || data.connectors.some((c) => c.recommended && connected.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-3">
        <Link
          href="/my-agents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-white transition-colors"
        >
          <span aria-hidden>←</span> Back to My Agents
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => goStep("try")}
            className={`btn text-xs !py-1.5 !px-3 ${
              activeStep === "try" ? "btn-primary" : "btn-ghost text-[var(--accent-bright)]"
            }`}
          >
            💬 Test in Sandbox
          </button>
          <button
            type="button"
            onClick={() => goStep("install")}
            className={`btn text-xs !py-1.5 !px-3 ${
              activeStep === "install" ? "btn-primary" : "btn-ghost text-[var(--muted)] hover:text-white"
            }`}
          >
            ⚡ Embed Code
          </button>
          <Link
            href="/my-agents?tab=insights"
            className="btn btn-ghost text-xs !py-1.5 !px-3 text-[var(--muted)] hover:text-white"
          >
            📊 Fleet Insights
          </Link>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
        <div className="card-specular-rim" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip text-[11px] font-semibold text-white/90">
                {marketFlag(m.market)}
              </span>
              <span className="chip text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-bright)]">
                {m.tier}
              </span>
              {hasWorkflow && (
                <span className="chip chip-live text-[11px]" title={t("studio.multiStepTitle")}>
                  {t("studio.multiStepAgent")}
                </span>
              )}
              <span className={`chip text-[11px] font-semibold ${rented ? "chip-live" : ""}`}>
                {t(rentalStatusKey(state))}
              </span>
              <span className="rounded-full bg-[var(--bg-elev)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--muted-dim)]">
                v1.1.0-verified
              </span>
            </div>
            <h1 className="display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {m.name}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--card-body)]">
              {m.summary}
            </p>
          </div>
        </div>

        {hasWorkflow ? (
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="max-w-2xl text-xs font-medium text-[var(--text)]">
              {t("studio.multiStepWorkflow")}{" "}
              <span className="text-[var(--muted)]">
                {demoHint ?? "Connect Calendar / Slack, then test prompts in sandbox."}
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label={t("studio.capabilitiesAria")}>
              {capabilityChips.map((label) => (
                <span
                  key={label}
                  className={`chip text-[11px] normal-case tracking-normal ${
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
          </div>
        ) : null}
      </div>

      <SetupGuide
        agentId={agentId}
        isWorkflow={hasWorkflow}
        rented={rented}
        hasTokens={(balanceTokens ?? 0) > 0}
        hasKnowledge={hasKnowledge}
        toolsConnected={toolsConnected}
        triedChat={triedChat}
        visitedInstall={visitedInstall}
        skippedConnect={skippedConnect}
        activeStep={activeStep}
        onStepChange={goStep}
        onSkipConnect={skipConnect}
        onConfirmKnowledge={confirmKnowledge}
      />

      <div className="space-y-4">
        {activeStep === "knowledge" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div id="studio-model" className="panel relative overflow-hidden rounded-2xl border border-[var(--line)] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.4)]">
              <div className="card-specular-rim" />
              <div className="mb-3 flex items-baseline justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">{t("studio.model")}</h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Select reasoning engine for this agent unit
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-dim)]">
                  Active: {model}
                </span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {MODELS.map((mod) => {
                  const isSelected = model === mod.id;
                  const speedTag =
                    mod.id === "gemini-flash" ? "⚡ Sub-120ms" :
                    mod.id === "gpt-4o-mini" ? "⚡ ~180ms" :
                    mod.id === "claude-sonnet" ? "⚡ ~250ms" :
                    mod.id === "gpt-4o" ? "⚡ ~320ms" : "⚡ ~600ms";
                  const depthTag =
                    mod.id === "claude-opus" || mod.id === "gpt-4o"
                      ? "Deep Reasoning"
                      : mod.id === "claude-sonnet"
                      ? "Enterprise Standard"
                      : "High Throughput";

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setModel(mod.id)}
                      className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-panel))] shadow-[0_0_16px_color-mix(in_srgb,var(--accent)_20%,transparent)]"
                          : "border-[var(--line)] bg-[var(--bg-elev)] hover:border-white/20 hover:bg-[var(--bg-panel-hover)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-bold ${isSelected ? "text-[var(--accent-bright)]" : "text-white"}`}>
                          {mod.label}
                        </span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold ${
                          isSelected ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-white/10 text-[var(--muted)]"
                        }`}>
                          {mod.burn}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--muted)] line-clamp-1">
                        {mod.blurb}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--line)] pt-2 text-[10px]">
                        <span className="font-semibold text-[var(--accent-bright)]">{speedTag}</span>
                        <span className="text-[var(--muted-dim)]">•</span>
                        <span className="text-[var(--muted-dim)]">{depthTag}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div id="studio-knowledge">
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
            </div>
          </div>
        ) : null}

        {activeStep === "connect" ? (
          <div className="space-y-4">
            {rentReadiness && !rentReadiness.ready ? (
              <div className="rounded-lg border border-[color-mix(in_srgb,var(--warn)_45%,transparent)] bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] px-4 py-3">
                <p className="text-sm font-semibold text-[var(--warn)]">
                  Connect to take live actions
                </p>
                <p className="mt-1 text-[13px] text-[var(--card-body)]">
                  This agent needs{" "}
                  <strong>{rentReadiness.missing.map((m) => m.name).join(", ")}</strong> to actually
                  book, order, or send. Until connected it still answers and hands off — and stays
                  honest, never claiming those actions happened.
                </p>
              </div>
            ) : null}
            <ActionsPanel
              agentId={agentId}
              connectors={data.connectors}
              connected={connected}
              onConnected={(ids) => setConnected(ids)}
            />
          </div>
        ) : null}

        {activeStep === "tokens" ? (
          <TokenTopUpPanel
            activated={rented}
            balanceTokens={balanceTokens}
            saving={saving}
            message={configMsg}
            onActivate={() => activate()}
            onContinueLive={() => goStep("install")}
            onCredited={(tokens) => setBalanceTokens(tokens)}
          />
        ) : null}

        {activeStep === "try" ? (
          <div className="mx-auto max-w-3xl">
            <SandboxChat
              agentId={agentId}
              mode="sandbox"
              freeTry={state === "selected"}
              highlightTry={tryMode || activeStep === "try"}
              onFirstMessage={markTried}
            />
          </div>
        ) : null}

        {activeStep === "install" ? (
          <div className="mx-auto max-w-3xl">
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
              onRent={() => goStep("tokens")}
              approvedDomains={approvedDomains}
              savingDomains={savingDomains}
              domainsMsg={domainsMsg}
              onSaveDomains={(d) => void saveDomains(d)}
            />
          </div>
        ) : null}

        {activeStep === "knowledge" || activeStep === "connect" ? (
          <details className="panel p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              {t("studio.tools", { count: data.package.tools.length })}
            </summary>
            <ul className="mt-3 space-y-2 text-sm">
              {data.package.tools.map((tool) => (
                <li key={tool.name} className="border-b border-[var(--line)] pb-2 last:border-0">
                  <code className="text-[var(--accent)]">{tool.name}</code>
                  {tool.side_effects && <span className="chip ml-2">{tool.side_effects}</span>}
                  <p className="text-xs text-[var(--muted)]">{tool.description}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
