"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/locale";

type Channel = "web" | "app";

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
              <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0d1219] p-3.5 text-[12px] leading-relaxed text-[var(--accent)]">
                {snippet}
              </pre>
              <button
                type="button"
                className="btn btn-primary mt-3 text-sm"
                disabled={!ready}
                onClick={onCopySnippet}
              >
                {copied ? t("studio.copied") : t("install.copyCode")}
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
            <Step n={3} title={t("install.webStep2Title")} body={t("install.webStep2Body")}>
              <details className="mt-3 group">
                <summary className="cursor-pointer text-sm font-medium text-[var(--accent-bright)]">
                  {t("install.whereToPaste")}
                </summary>
                <ul className="mt-2 space-y-2 border-l-2 border-[var(--line)] pl-3 text-sm text-[var(--muted)]">
                  <li>
                    <span className="font-medium text-[var(--text)]">WordPress</span> —{" "}
                    {t("studio.embedWordPressBody")}
                  </li>
                  <li>
                    <span className="font-medium text-[var(--text)]">Shopify</span> —{" "}
                    {t("studio.embedShopifyBody")}
                  </li>
                  <li>
                    <span className="font-medium text-[var(--text)]">Wix</span> —{" "}
                    {t("studio.embedWixBody")}
                  </li>
                </ul>
              </details>
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
