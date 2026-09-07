"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/locale";

type Channel = "web" | "app";

const PLATFORMS = [
  { id: "html", label: "Custom HTML / React", icon: "🌐" },
  { id: "wordpress", label: "WordPress", icon: "Ⓜ️" },
  { id: "shopify", label: "Shopify", icon: "🛍️" },
  { id: "webflow", label: "Webflow", icon: "🔷" },
  { id: "wix", label: "Wix / Squarespace", icon: "⚡" },
] as const;

export function InstallPanel({
  ready,
  publicKey,
  snippet,
  appUrl,
  appTitle,
  appGreeting,
  appAccent,
  appAccent2,
  onAppTitle,
  onAppGreeting,
  onAppAccent,
  onAppAccent2,
  copied,
  copiedApp,
  onCopySnippet,
  onCopyAppUrl,
  onRent,
  approvedDomains,
  savingDomains,
  domainsMsg,
  onSaveDomains,
}: {
  ready: boolean;
  publicKey: string;
  snippet: string;
  appUrl: string;
  appTitle: string;
  appGreeting: string;
  appAccent: string;
  appAccent2: string;
  onAppTitle: (v: string) => void;
  onAppGreeting: (v: string) => void;
  onAppAccent: (v: string) => void;
  onAppAccent2: (v: string) => void;
  copied: boolean;
  copiedApp: boolean;
  onCopySnippet: () => void;
  onCopyAppUrl: () => void;
  onRent: () => void;
  /** Approved-domains lock for the embed key; empty = unlocked (anyone with the key can use it). */
  approvedDomains: string[];
  savingDomains: boolean;
  domainsMsg: { kind: "ok" | "err"; text: string } | null;
  onSaveDomains: (domains: string[]) => void;
}) {
  const t = useT();
  const [channel, setChannel] = useState<Channel>("web");
  const [platform, setPlatform] = useState<"html" | "wordpress" | "shopify" | "webflow" | "wix">("html");
  const locked = approvedDomains.length > 0;
  const domainsKey = approvedDomains.join(", ");
  const [domainsInput, setDomainsInput] = useState(domainsKey);
  // Keep the field in sync once the rental (and its lock) finishes loading or is saved.
  useEffect(() => {
    setDomainsInput(domainsKey);
  }, [domainsKey]);

  return (
    <div className="space-y-4">
      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--text)]">
            {t("install.heading")}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {t("install.lede")}
          </p>
        </div>

        <div
          className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-1"
          role="tablist"
          aria-label={t("install.channelLabel")}
        >
          {(
            [
              ["web", "install.channelWeb"],
              ["app", "install.channelApp"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={channel === id}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                channel === id
                  ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              onClick={() => setChannel(id)}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {!ready ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--text)]">{t("install.needRentTitle")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("install.needRentBody")}</p>
            <button type="button" className="btn btn-primary mt-3 text-sm" onClick={onRent}>
              {t("install.needRentCta")}
            </button>
          </div>
        ) : null}

        {channel === "web" ? (
          <ol className="space-y-5">
            <Step n={1} title={t("install.webStep1Title")} body={t("install.webStep1Body")}>
              <div className="mt-3 relative overflow-hidden rounded-xl border border-[var(--line)] bg-[#0a0f16]">
                <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elev)]/60 px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--accent)]" />
                    <span className="font-mono text-[11px] text-[var(--muted)]">Website Embed Script (agent.js)</span>
                  </div>
                  <span className="rounded bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--accent-bright)]">
                    🔒 SRI Hash Protected
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed font-mono text-[var(--accent-bright)]">
                  {snippet}
                </pre>
              </div>
              <button
                type="button"
                className={`btn mt-3 text-sm font-semibold transition-all ${
                  copied ? "!bg-emerald-400 !text-black shadow-lg" : "btn-primary"
                }`}
                disabled={!ready}
                onClick={onCopySnippet}
              >
                {copied ? `✓ ${t("studio.copied")}` : t("install.copyCode")}
              </button>
            </Step>
            <Step n={2} title={t("install.lockHeading")} body={t("install.lockBody")}>
              {locked ? (
                <p className="mt-3 text-sm font-medium text-[var(--accent-bright)]" data-testid="install-domains-locked">
                  {t("install.lockLockedTo", { domains: approvedDomains.join(", ") })}
                </p>
              ) : (
                <div
                  className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-4 py-3"
                  data-testid="install-domains-warning"
                >
                  <p className="text-sm font-medium text-[var(--text)]">{t("install.lockWarn")}</p>
                </div>
              )}
              <label className="mt-3 block text-sm text-[var(--muted)]">
                {t("install.lockField")}
                <input
                  className="input mt-1.5 w-full max-w-md text-sm"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  placeholder={t("install.lockPlaceholder")}
                  disabled={!ready || savingDomains}
                  data-testid="install-domains"
                />
              </label>
              <p className="mt-1 text-xs text-[var(--muted-dim)]">{t("install.lockHint")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  disabled={!ready || savingDomains}
                  onClick={() => onSaveDomains(parseDomains(domainsInput))}
                  data-testid="install-domains-save"
                >
                  {savingDomains ? t("install.lockSaving") : t("install.lockSave")}
                </button>
                {domainsMsg ? (
                  <span
                    className={
                      domainsMsg.kind === "ok"
                        ? "text-sm text-[var(--accent-bright)]"
                        : "text-sm text-[var(--warn,#fb923c)]"
                    }
                  >
                    {domainsMsg.text}
                  </span>
                ) : null}
              </div>
            </Step>
            <Step n={3} title={t("install.webStep2Title")} body="Follow the quick visual guide for your website CMS or framework:">
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-1">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        platform === p.id
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                          : "text-[var(--muted)] hover:text-white"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[#0a0f16] p-4 text-xs space-y-2.5">
                  {platform === "html" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>HTML / React / Next.js / Static Sites</span>
                        <span className="text-[10px] text-emerald-400 font-mono">1-Line Embed</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>Open your website template or layout file (e.g. <code className="text-slate-300">index.html</code> or <code className="text-slate-300">footer.html</code>).</li>
                        <li>Scroll to the bottom and paste the script snippet directly before the closing <code className="text-[var(--accent-bright)]">&lt;/body&gt;</code> tag.</li>
                        <li>Save and deploy. The floating agent chat bubble will automatically appear in the bottom-right corner!</li>
                      </ol>
                    </>
                  )}

                  {platform === "wordpress" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>WordPress (Elementor, Divi, Gutenberg, or Classic)</span>
                        <span className="text-[10px] text-blue-400 font-mono">Zero Code</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>In your WordPress Admin dashboard, go to <strong className="text-white">Plugins → Add New</strong>.</li>
                        <li>Search for <strong className="text-white">WPCode</strong> (or use <strong className="text-white">Appearance → Theme File Editor → footer.php</strong>).</li>
                        <li>Click <strong className="text-white">Add New Snippet</strong> → Select <strong className="text-white">Add Your Custom Code (New Snippet)</strong>.</li>
                        <li>Set Code Type to <strong className="text-white">HTML Snippet</strong>, Insertion to <strong className="text-white">Site Wide Footer</strong>, paste your embed script, and toggle to <strong className="text-emerald-400">Active</strong>.</li>
                      </ol>
                    </>
                  )}

                  {platform === "shopify" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Shopify (Dawn & all Liquid themes)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">theme.liquid</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>In your Shopify Admin, click <strong className="text-white">Online Store → Themes</strong>.</li>
                        <li>Click the <strong className="text-white">...</strong> (three dots) button next to your live theme and choose <strong className="text-white">Edit code</strong>.</li>
                        <li>In the left sidebar under <strong className="text-white">Layout</strong>, select <code className="text-slate-300">theme.liquid</code>.</li>
                        <li>Scroll to the bottom of the file, paste your embed script tag right before the closing <code className="text-[var(--accent-bright)]">&lt;/body&gt;</code> tag, and click <strong className="text-white">Save</strong>.</li>
                      </ol>
                    </>
                  )}

                  {platform === "webflow" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Webflow</span>
                        <span className="text-[10px] text-indigo-400 font-mono">Custom Code</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>In your Webflow Designer/Dashboard, open <strong className="text-white">Project Settings</strong>.</li>
                        <li>Navigate to the <strong className="text-white">Custom Code</strong> tab in the left sidebar.</li>
                        <li>Scroll down to the <strong className="text-white">Footer Code</strong> section (<code className="text-slate-300">Before &lt;/body&gt; tag</code>).</li>
                        <li>Paste your embed snippet, click <strong className="text-white">Save Changes</strong>, and click <strong className="text-white">Publish</strong> to publish the changes live.</li>
                      </ol>
                    </>
                  )}

                  {platform === "wix" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Wix, Squarespace & Framer</span>
                        <span className="text-[10px] text-amber-400 font-mono">Site Settings</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>In your Wix or Squarespace site dashboard, navigate to <strong className="text-white">Settings → Custom Code</strong> (or <strong className="text-white">Developer Tools</strong>).</li>
                        <li>Click <strong className="text-white">+ Add Custom Code</strong> and paste your script snippet.</li>
                        <li>Set <strong className="text-white">Place Code in</strong> to <strong className="text-white">Body - end</strong>.</li>
                        <li>Select <strong className="text-white">Apply to: All Pages</strong> and click <strong className="text-white">Apply</strong>.</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>
            </Step>
            <Step n={4} title={t("install.webStep3Title")} body={t("install.webStep3Body")} />
          </ol>
        ) : (
          <ol className="space-y-5">
            <Step n={1} title={t("install.appStep1Title")} body={t("install.appStep1Body")}>
              <label className="mt-3 block text-sm text-[var(--muted)]">
                {t("studio.appFieldTitle")}
                <input
                  className="input mt-1.5 w-full max-w-md text-sm"
                  value={appTitle}
                  onChange={(e) => onAppTitle(e.target.value)}
                  disabled={!ready}
                />
              </label>
              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm font-medium text-[var(--accent-bright)]">
                  {t("install.customizeLook")}
                </summary>
                <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-[var(--muted)] sm:col-span-2">
                    {t("studio.appFieldGreeting")}
                    <input
                      className="input mt-1.5 w-full text-sm"
                      value={appGreeting}
                      onChange={(e) => onAppGreeting(e.target.value)}
                      disabled={!ready}
                    />
                  </label>
                  <label className="block text-sm text-[var(--muted)]">
                    {t("studio.appFieldAccent")}
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(appAccent)}
                        onChange={(e) => onAppAccent(e.target.value)}
                        disabled={!ready}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--line)] bg-transparent p-1"
                        aria-label={t("studio.appFieldAccent")}
                      />
                      <input
                        className="input flex-1 font-mono text-sm"
                        value={appAccent}
                        onChange={(e) => onAppAccent(e.target.value)}
                        disabled={!ready}
                      />
                    </div>
                  </label>
                  <label className="block text-sm text-[var(--muted)]">
                    {t("studio.appFieldAccent2")}
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(appAccent2)}
                        onChange={(e) => onAppAccent2(e.target.value)}
                        disabled={!ready}
                        className="h-10 w-12 cursor-pointer rounded border border-[var(--line)] bg-transparent p-1"
                        aria-label={t("studio.appFieldAccent2")}
                      />
                      <input
                        className="input flex-1 font-mono text-sm"
                        value={appAccent2}
                        onChange={(e) => onAppAccent2(e.target.value)}
                        disabled={!ready}
                      />
                    </div>
                  </label>
                </div>
              </details>
            </Step>
            <Step n={2} title={t("install.appStep2Title")} body={t("install.appStep2Body")}>
              <pre className="mt-3 overflow-x-auto break-all rounded-xl bg-[#0d1219] p-3.5 text-[12px] leading-relaxed text-[var(--accent)]">
                {appUrl}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={ready ? appUrl : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`btn text-sm ${!ready ? "pointer-events-none opacity-50" : ""}`}
                >
                  {t("install.openPreview")}
                </a>
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  disabled={!ready}
                  onClick={onCopyAppUrl}
                >
                  {copiedApp ? t("studio.copied") : t("install.copyLink")}
                </button>
              </div>
            </Step>
            <Step n={3} title={t("install.appStep3Title")} body={t("install.appStep3Body")}>
              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm font-medium text-[var(--accent-bright)]">
                  {t("install.devHints")}
                </summary>
                <ul className="mt-2 space-y-2 border-l-2 border-[var(--line)] pl-3 text-sm text-[var(--muted)]">
                  <li>
                    <span className="font-medium text-[var(--text)]">iOS</span> —{" "}
                    {t("install.iosShort")}
                  </li>
                  <li>
                    <span className="font-medium text-[var(--text)]">Android</span> —{" "}
                    {t("install.androidShort")}
                  </li>
                </ul>
              </details>
            </Step>
          </ol>
        )}

        {ready && publicKey ? (
          <p className="border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
            {t("install.keyLabel")}{" "}
            <code className="text-[var(--accent)]">{publicKey}</code>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-xs font-semibold text-[var(--accent-bright)]"
        aria-hidden
      >
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
        {children}
      </div>
    </li>
  );
}

function parseDomains(raw: string): string[] {
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

function normalizeHex(v: string): string {
  const t = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t;
  return "#2bb8a8";
}
