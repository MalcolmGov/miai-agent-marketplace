"use client";

import Link from "next/link";
import { useState } from "react";
import { LanguageSelect } from "@/components/LanguageSelect";
import { ThemeToggle } from "@/components/ThemeToggle";

type SettingsTab = "preferences" | "workspace" | "security" | "developer";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [orgName, setOrgName] = useState("MyInstantAI Workspace");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saveMsg, setSaveMsg] = useState(false);

  function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(true);
    setTimeout(() => setSaveMsg(false), 2500);
  }

  function copyApiKey() {
    navigator.clipboard.writeText("miai_live_9f82d04a7e12c481b99a071f");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-12 pt-2">
      <header className="space-y-1 pt-2">
        <h1 className="display text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
          Workspace &amp; System Settings
        </h1>
        <p className="text-sm text-[var(--card-body)]">
          Manage localization, organization identity, API credentials, and enterprise data retention policies.
        </p>
      </header>

      {/* Navigation Pills */}
      <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[color-mix(in_srgb,var(--bg-elev)_85%,transparent)] p-1 border border-[var(--line)]" role="tablist">
        {(
          [
            ["preferences", "🎨 Appearance & Locale"],
            ["workspace", "🏢 Workspace Profile"],
            ["security", "🛡️ Security & Compliance"],
            ["developer", "⚡ Developer & API"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === id
                ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "preferences" ? (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Localization &amp; Language</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Select your preferred dashboard language and localized agent defaults.
            </p>
            <div className="mt-3 max-w-xs">
              <LanguageSelect />
            </div>
          </div>

          <div className="border-t border-[var(--line)]/60 pt-5">
            <h2 className="text-base font-bold text-white tracking-tight">Interface Theme</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Switch between high-contrast dark mode and cool mid-light theme.
            </p>
            <div className="mt-3">
              <ThemeToggle />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "workspace" ? (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Workspace Identity</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Your organization display name across agent embeds, emails, and audit reports.
            </p>
          </div>

          <form onSubmit={handleSaveOrg} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)] mb-1.5">
                Workspace ID
              </label>
              <input
                type="text"
                readOnly
                value="ws_enterprise_prod_24"
                className="input font-mono !bg-black/40 text-[var(--muted)] cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary text-xs font-semibold">
                Save Workspace Changes
              </button>
              {saveMsg ? (
                <span className="text-xs font-semibold text-emerald-400">✓ Changes saved</span>
              ) : null}
            </div>
          </form>

          <div className="border-t border-[var(--line)]/60 pt-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-dim)]">Current Plan</span>
              <p className="text-base font-bold text-white mt-0.5">Enterprise Workspaces Tier</p>
              <p className="text-xs text-[var(--muted)]">Includes 500 global agent catalogue access and dedicated webhook rails.</p>
            </div>
            <Link href="/tokens" className="btn btn-ghost text-xs">
              Manage Billing →
            </Link>
          </div>
        </section>
      ) : null}

      {activeTab === "security" ? (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg border border-emerald-500/30">
              🛡️
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Zero Customer Data Retention (ZCDR)</h2>
              <p className="text-xs text-[var(--muted)] mt-0.5">
                Conversational inferences and customer PII are strictly processed in-memory and never retained.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-4">
              <span className="font-bold text-sm text-white">Data Residency</span>
              <p className="text-xs text-[var(--muted)] mt-1">
                Routing matches regional agent markets (US-East, EU-Frankfurt, Africa-JNB, Asia-Singapore).
              </p>
              <span className="chip chip-live mt-3 !text-[10px]">Enforced</span>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-4">
              <span className="font-bold text-sm text-white">Audit &amp; DSAR Export</span>
              <p className="text-xs text-[var(--muted)] mt-1">
                Export or permanently purge any tenant interaction metadata via GDPR/POPIA compliant protocols.
              </p>
              <a href="/api/dsar/export" download className="btn btn-ghost mt-3 !py-1 text-[11px] inline-block">
                Download DSAR Export ↓
              </a>
            </div>
          </div>

          <div className="border-t border-[var(--line)]/60 pt-4 flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">Review complete architectural security claims</span>
            <Link href="/trust" className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
              Visit Trust Center →
            </Link>
          </div>
        </section>
      ) : null}

      {activeTab === "developer" ? (
        <section className="panel card-specular-rim relative overflow-hidden rounded-2xl border border-[var(--line)] p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">API Keys &amp; Webhook Credentials</h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Authenticate programmatic agent turns, MCP server tool invocations, and incoming event webhooks.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-dim)]">
              Workspace Live Secret Key
            </label>
            <div className="flex items-center gap-2 max-w-lg">
              <input
                type={showKey ? "text" : "password"}
                readOnly
                value="miai_live_9f82d04a7e12c481b99a071f"
                className="input font-mono !bg-black/50 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="btn btn-ghost text-xs shrink-0"
              >
                {showKey ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={copyApiKey}
                className="btn btn-primary text-xs shrink-0"
              >
                {copiedKey ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-[var(--muted-dim)]">
              Never share this key client-side. For website widgets, use the public Embed Key generated in Agent Studio.
            </p>
          </div>

          <div className="border-t border-[var(--line)]/60 pt-5 flex items-center justify-between">
            <span className="text-xs text-[var(--muted)]">OpenAPI v3 Contract &amp; Schemas</span>
            <a href="/api/v1/openapi" target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
              View OpenAPI Specification ↗
            </a>
          </div>
        </section>
      ) : null}
    </div>
  );
}
