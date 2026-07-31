"use client";

import { useEffect, useMemo, useState } from "react";
import { MODELS } from "@/lib/models";
import { TIER_PRICES } from "@/lib/constants";
import { SandboxChat } from "./SandboxChat";
import { ActionsPanel } from "./ActionsPanel";

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
  const [tab, setTab] = useState<"configure" | "actions" | "install">("configure");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when agent route changes
  }, [agentId]);

  const snippet = useMemo(() => {
    const key = publicKey || `mia_pk_${agentId}_demo`;
    return `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/agents/v1/agent.js" data-key="${key}" async></script>`;
  }, [publicKey, agentId]);

  async function rent() {
    setSaving(true);
    try {
      const res = await fetch("/api/rent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, tier }),
      });
      const json = await res.json();
      setPublicKey(json.rental.publicKey);
      setState(json.rental.state);
      setTab("configure");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveConfig(markRented = false) {
    setSaving(true);
    try {
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
      if (json.rental) {
        setState(json.rental.state);
        setPublicKey(json.rental.publicKey);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return <div className="text-[var(--muted)]">Loading agent…</div>;
  }

  const m = data.package.manifest;

  return (
    <div className="space-y-6">
      <div className="rise flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {data.pilot && <span className="chip chip-live">Pilot</span>}
            <span className="chip">{m.tier}</span>
            <span className="chip">{(m.market ?? "za").toUpperCase()}</span>
            <span className="chip">state: {state}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{m.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{m.summary}</p>
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
            {state === "selected" ? "Rent & configure" : "Update entitlement"}
          </button>
        </div>
      </div>

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
            onClick={() => setTab(id)}
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
              <div className="panel p-4">
                <h2 className="mb-2 text-sm font-semibold">Knowledge</h2>
                <p className="mb-2 text-xs text-[var(--muted)]">
                  Paste FAQs, policies, hours. File upload / website crawl jobs plug in here later.
                </p>
                <textarea
                  className="input min-h-[180px] font-mono text-xs"
                  value={knowledge}
                  onChange={(e) => setKnowledge(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={() => saveConfig(false)}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || state === "selected"}
                    onClick={() => saveConfig(true)}
                  >
                    Mark rented → ready
                  </button>
                </div>
              </div>
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
              <div>
                <h2 className="text-sm font-semibold">Web embed</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Paste before <code>&lt;/body&gt;</code>. Key:{" "}
                  <code className="text-[var(--accent)]">{publicKey || "rent to mint"}</code>
                </p>
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

          <div className="panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Tools ({data.package.tools.length})</h2>
            <ul className="space-y-2 text-sm">
              {data.package.tools.map((t) => (
                <li key={t.name} className="border-b border-[var(--line)] pb-2 last:border-0">
                  <code className="text-[var(--accent)]">{t.name}</code>
                  {t.side_effects && (
                    <span className="chip ml-2">{t.side_effects}</span>
                  )}
                  <p className="text-xs text-[var(--muted)]">{t.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <SandboxChat
          agentId={agentId}
          mode={state === "live" || state === "rented" ? "live" : "sandbox"}
        />
      </div>
    </div>
  );
}
