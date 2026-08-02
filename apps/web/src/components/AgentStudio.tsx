"use client";

import { KnowledgePanel } from "./KnowledgePanel";
import { ActionsPanel } from "./ActionsPanel";
import { InstallPanel } from "./InstallPanel";
import { RentPayPanel } from "./RentPayPanel";
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

function stepFromUrl(): SetupStepId | null {
  const params = new URLSearchParams(window.location.search);
  const step = params.get("step");
  if (isSetupStepId(step)) return step;
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
    const rentedNow = (data.rental?.state ?? "selected") !== "selected";
    const connectedNow = data.rental?.connectedConnectors ?? [];
    const toolsOk = hasWorkflow
      ? connectedNow.some((id) => id === "google_calendar" || id === "slack" || id === "calendar")
      : connectedNow.length > 0;
    setActiveStep(
      resolveSetupStep({
        hasKnowledge: readSetupFlag(agentId, "knowledge"),
        connectDone: toolsOk || readSetupFlag(agentId, "skip-connect"),
        rented: rentedNow,
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
    // Demo keys only in local/dev — production requires a real rented publicKey.
    const allowDemo = process.env.NODE_ENV !== "production";
    const key = publicKey || (allowDemo ? `mia_pk_${agentId}_demo` : "");
    if (!key) {
      return `<!-- Rent this agent to get an embed key, then paste the Install snippet. -->`;
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
    return true;
  }

  async function rent(): Promise<boolean> {
    setSaving(true);
    setConfigMsg(null);
    try {
      const ok = await ensureRented();
      if (!ok) return false;
      setConfigMsg({ kind: "ok", text: t("studio.okRented") });
      await load();
      setActiveStep("install");
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
    return <div className="text-[var(--muted)]">{t("studio.loading")}</div>;
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
      <div className="rise">
        <div className="mb-2 flex flex-wrap gap-2">
          {hasWorkflow && (
            <span className="chip chip-live" title={t("studio.multiStepTitle")}>
              {t("studio.multiStepAgent")}
            </span>
          )}
          <span className="chip">{m.tier}</span>
          <span className="chip">
            {(m.market === "za" ? "africa" : m.market ?? "africa").toUpperCase()}
          </span>
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
              {demoHint ?? "Connect Calendar / Slack, then try a prompt in sandbox."}
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

      <SetupGuide
        agentId={agentId}
        isWorkflow={hasWorkflow}
        rented={rented}
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
            <div id="studio-model" className="panel p-4">
              <h2 className="mb-1 text-sm font-semibold">{t("studio.model")}</h2>
              <p className="mb-3 text-xs text-[var(--muted)]">
                Required — pick a model. Sonnet is the default for quality.
              </p>
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
          <ActionsPanel
            agentId={agentId}
            connectors={data.connectors}
            connected={connected}
            onConnected={(ids) => setConnected(ids)}
          />
        ) : null}

        {activeStep === "rent" ? (
          <RentPayPanel
            tier={tier}
            onTierChange={setTier}
            rented={rented}
            saving={saving}
            message={configMsg}
            onPayAndActivate={() => rent()}
            onContinueLive={() => goStep("install")}
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
              onRent={() => goStep("rent")}
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
