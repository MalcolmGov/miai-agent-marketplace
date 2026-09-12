"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/lib/locale";

type Channel = "web" | "app";

const PLATFORMS = [
  { id: "html", label: "Custom HTML / React", iconSvg: "/icons/connectors/react.svg", emojiFallback: "🌐" },
  { id: "wordpress", label: "WordPress", iconSvg: "/icons/connectors/wordpress.svg", emojiFallback: "Ⓜ️" },
  { id: "shopify", label: "Shopify", iconSvg: "/icons/connectors/shopify.svg", emojiFallback: "🛍️" },
  { id: "webflow", label: "Webflow", iconSvg: "/icons/connectors/webflow.svg", emojiFallback: "🔷" },
  { id: "wix", label: "Wix / Squarespace", iconSvg: "/icons/connectors/wix.svg", emojiFallback: "⚡" },
] as const;

const MOBILE_PLATFORMS = [
  { id: "react-native", label: "React Native / Expo", badge: "Cross-Platform" },
  { id: "flutter", label: "Flutter", badge: "Cross-Platform" },
  { id: "ios", label: "iOS (SwiftUI / UIKit)", badge: "Native" },
  { id: "android", label: "Android (Kotlin / Compose)", badge: "Native" },
  { id: "nocode", label: "No-Code (FlutterFlow / Bubble)", badge: "Zero-Code" },
] as const;

type MobilePlatform = (typeof MOBILE_PLATFORMS)[number]["id"];

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
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>("react-native");
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
              <div className="mt-3">
                <CodeSnippet
                  code={snippet}
                  language="html"
                  badge="agent.js · SRI Protected"
                />
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
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        platform === p.id
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                          : "text-[var(--muted)] hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <img src={p.iconSvg} alt="" className="h-3.5 w-3.5 object-contain" />
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
          <ol className="space-y-6">
            <Step n={1} title={t("install.appStep1Title")} body={t("install.appStep1Body")}>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-semibold text-white/90">
                  {t("studio.appFieldTitle")}
                  <input
                    type="text"
                    className="input mt-1.5 w-full max-w-md text-sm bg-[var(--bg-elev)] border border-[var(--line)] text-white focus:border-[var(--accent)]"
                    value={appTitle}
                    onChange={(e) => onAppTitle(e.target.value)}
                    placeholder="e.g. Practice Assistant"
                  />
                </label>

                <details className="mt-2 group">
                  <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-bright)] hover:underline inline-flex items-center gap-1.5">
                    <span>▶</span> {t("install.customizeLook")}
                  </summary>
                  <div className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/50 p-4">
                    <label className="block text-xs font-semibold text-white/90 sm:col-span-2">
                      {t("studio.appFieldGreeting")}
                      <input
                        type="text"
                        className="input mt-1.5 w-full text-xs text-white"
                        value={appGreeting}
                        onChange={(e) => onAppGreeting(e.target.value)}
                        placeholder="Hi — I'm your AI assistant. How can I help you today?"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-white/90">
                      {t("studio.appFieldAccent")}
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHex(appAccent)}
                          onChange={(e) => onAppAccent(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1"
                          aria-label={t("studio.appFieldAccent")}
                        />
                        <input
                          type="text"
                          className="input flex-1 font-mono text-xs text-white"
                          value={appAccent}
                          onChange={(e) => onAppAccent(e.target.value)}
                          placeholder="#2bb8a8"
                        />
                      </div>
                    </label>
                    <label className="block text-xs font-semibold text-white/90">
                      {t("studio.appFieldAccent2")}
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizeHex(appAccent2)}
                          onChange={(e) => onAppAccent2(e.target.value)}
                          className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--line)] bg-transparent p-1"
                          aria-label={t("studio.appFieldAccent2")}
                        />
                        <input
                          type="text"
                          className="input flex-1 font-mono text-xs text-white"
                          value={appAccent2}
                          onChange={(e) => onAppAccent2(e.target.value)}
                          placeholder="#157f8d"
                        />
                      </div>
                    </label>
                  </div>
                </details>
              </div>
            </Step>

            <Step n={2} title={t("install.appStep2Title")} body={t("install.appStep2Body")}>
              <div className="mt-3 relative overflow-hidden rounded-xl border border-[var(--line)] bg-[#0a0f16]">
                <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--bg-elev)]/60 px-4 py-2 text-xs">
                  <span className="font-mono text-[11px] text-[var(--muted)]">Target App URL</span>
                  <span className="rounded bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--accent-bright)]">
                    ⚡ Realtime Query Sync
                  </span>
                </div>
                <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed font-mono text-[var(--accent)] break-all">
                  {appUrl}
                </pre>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn text-xs font-semibold"
                >
                  🔗 {t("install.openPreview")}
                </a>
                <button
                  type="button"
                  className={`btn text-xs font-semibold transition-all ${
                    copiedApp ? "!bg-emerald-400 !text-black shadow-lg" : "btn-primary"
                  }`}
                  onClick={onCopyAppUrl}
                >
                  {copiedApp ? `✓ ${t("studio.copied")}` : `📋 ${t("install.copyLink")}`}
                </button>
              </div>
            </Step>

            <Step
              n={3}
              title="Integrate into your iOS & Android App"
              body="Select your mobile framework or no-code builder below for production-tested code snippets and configuration:"
            >
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] p-1">
                  {MOBILE_PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setMobilePlatform(p.id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        mobilePlatform === p.id
                          ? "bg-[var(--accent)] text-[var(--accent-ink)] shadow-sm"
                          : "text-[var(--muted)] hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-mono ${
                          mobilePlatform === p.id
                            ? "bg-black/20 text-black font-bold"
                            : "bg-white/10 text-[var(--muted)]"
                        }`}
                      >
                        {p.badge}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[#0a0f16] p-4 text-xs space-y-3">
                  {mobilePlatform === "react-native" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>React Native & Expo (iOS & Android)</span>
                        <span className="text-[10px] text-cyan-400 font-mono">react-native-webview</span>
                      </div>
                      <p className="text-[var(--muted)] leading-relaxed">
                        1. Install dependencies in your project:
                      </p>
                      <CodeSnippet
                        code="npx expo install react-native-webview react-native-safe-area-context"
                        language="bash"
                        badge="Terminal"
                      />
                      <p className="text-[var(--muted)] leading-relaxed">
                        2. Create your chat screen component (e.g. <code className="text-white font-mono">AgentChatScreen.tsx</code>):
                      </p>
                      <CodeSnippet
                        code={`import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AgentChatScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <WebView
        source={{ uri: '${appUrl}' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        startInLoadingState={true}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d14' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});`}
                        language="tsx"
                        badge="AgentChatScreen.tsx"
                      />
                    </>
                  )}

                  {mobilePlatform === "flutter" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Flutter (iOS & Android)</span>
                        <span className="text-[10px] text-blue-400 font-mono">webview_flutter</span>
                      </div>
                      <p className="text-[var(--muted)] leading-relaxed">
                        1. Add <code className="text-white font-mono">webview_flutter</code> to your project:
                      </p>
                      <CodeSnippet
                        code="flutter pub add webview_flutter"
                        language="bash"
                        badge="Terminal"
                      />
                      <p className="text-[var(--muted)] leading-relaxed">
                        2. Create your chat widget (e.g. <code className="text-white font-mono">agent_chat_screen.dart</code>):
                      </p>
                      <CodeSnippet
                        code={`import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class AgentChatScreen extends StatefulWidget {
  const AgentChatScreen({super.key});

  @override
  State<AgentChatScreen> createState() => _AgentChatScreenState();
}

class _AgentChatScreenState extends State<AgentChatScreen> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF090D14))
      ..loadRequest(Uri.parse('${appUrl}'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D14),
      body: SafeArea(
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}`}
                        language="dart"
                        badge="agent_chat_screen.dart"
                      />
                    </>
                  )}

                  {mobilePlatform === "ios" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Native iOS (SwiftUI & WebKit)</span>
                        <span className="text-[10px] text-purple-400 font-mono">WKWebView</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>Import <code className="text-white font-mono">WebKit</code> and wrap <code className="text-white font-mono">WKWebView</code> in a SwiftUI <code className="text-white font-mono">UIViewRepresentable</code>.</li>
                        <li>Ensure <code className="text-white font-mono">allowsInlineMediaPlayback = true</code> so audio and voice responses stream smoothly.</li>
                        <li>Embed inside your SwiftUI screen view:</li>
                      </ol>
                      <CodeSnippet
                        code={`import SwiftUI
import WebKit

struct AgentWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 9/255, green: 13/255, blue: 20/255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct AgentChatView: View {
    var body: some View {
        AgentWebView(url: URL(string: "${appUrl}")!)
            .ignoresSafeArea(.keyboard)
    }
}`}
                        language="swift"
                        badge="AgentChatView.swift"
                      />
                    </>
                  )}

                  {mobilePlatform === "android" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>Native Android (Kotlin & Jetpack Compose)</span>
                        <span className="text-[10px] text-emerald-400 font-mono">AndroidView</span>
                      </div>
                      <ol className="space-y-1.5 text-[var(--muted)] list-decimal list-inside leading-relaxed">
                        <li>In <code className="text-white font-mono">AndroidManifest.xml</code>, verify internet access is granted:</li>
                      </ol>
                      <CodeSnippet
                        code='<uses-permission android:name="android.permission.INTERNET" />'
                        language="xml"
                        badge="AndroidManifest.xml"
                      />
                      <p className="text-[var(--muted)] leading-relaxed">
                        2. Render the WebView inside your Jetpack Compose screen:
                      </p>
                      <CodeSnippet
                        code={`import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AgentChatScreen(url: String = "${appUrl}") {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                webViewClient = WebViewClient()
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                }
                loadUrl(url)
            }
        }
    )
}`}
                        language="kotlin"
                        badge="AgentChatScreen.kt"
                      />
                    </>
                  )}

                  {mobilePlatform === "nocode" && (
                    <>
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 font-semibold text-white">
                        <span>No-Code Mobile App Builders</span>
                        <span className="text-[10px] text-amber-400 font-mono">Zero Code</span>
                      </div>
                      <div className="space-y-3 text-[var(--muted)] leading-relaxed">
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-3 space-y-2">
                          <div>
                            <p className="font-semibold text-white">FlutterFlow</p>
                            <p className="mt-1">Add a <strong className="text-slate-200">WebView</strong> component to your page. Set <strong className="text-slate-200">URL Type</strong> to Static, paste your App URL, and toggle <strong className="text-emerald-400">Allow JavaScript: ON</strong>.</p>
                          </div>
                          <CodeSnippet code={appUrl} language="url" badge="App URL" />
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-3 space-y-2">
                          <div>
                            <p className="font-semibold text-white">Bubble Mobile / BDK Native</p>
                            <p className="mt-1">In your mobile wrapper, insert a <strong className="text-slate-200">WebView element</strong> with the App URL. Check <strong className="text-emerald-400">Persist LocalStorage & Cookies</strong>.</p>
                          </div>
                          <CodeSnippet code={appUrl} language="url" badge="App URL" />
                        </div>
                        <div className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-3 space-y-2">
                          <div>
                            <p className="font-semibold text-white">WebViewGold (iOS & Android)</p>
                            <p className="mt-1">In the WebViewGold template, open <code className="text-slate-200 font-mono">Config.swift</code> or <code className="text-slate-200 font-mono">Config.java</code> and set:</p>
                          </div>
                          <CodeSnippet
                            code={`var webViewUrl = "${appUrl}"`}
                            language="swift / java"
                            badge="Config"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile Production Checklist */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5 text-xs text-cyan-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>📱</span>
                    <span>Production Mobile Checklist</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-[var(--muted)] list-disc list-inside">
                    <li><strong className="text-white">DOM Storage:</strong> Keep <code className="text-cyan-300 font-mono">domStorageEnabled = true</code> so conversations persist between screen transitions and backgrounding.</li>
                    <li><strong className="text-white">Audio Stream:</strong> Set <code className="text-cyan-300 font-mono">allowsInlineMediaPlayback = true</code> so voice audio plays cleanly without opening video players.</li>
                    <li><strong className="text-white">Microphone (Optional):</strong> If enabling voice speech-to-text, declare <code className="text-cyan-300 font-mono">NSMicrophoneUsageDescription</code> in iOS and <code className="text-cyan-300 font-mono">android.permission.RECORD_AUDIO</code> in Android.</li>
                  </ul>
                </div>
              </div>
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

function CodeSnippet({
  code,
  language,
  badge,
}: {
  code: string;
  language?: string;
  badge?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative group overflow-hidden rounded-xl border border-[var(--line)] bg-[#070b12] text-xs">
      <div className="flex items-center justify-between border-b border-[var(--line)]/60 bg-white/[0.02] px-3.5 py-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span className="font-mono text-[10px] text-[var(--muted)]">{language ?? "code"}</span>
          {badge && (
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-[var(--muted)]">
              {badge}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
            copied
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-[var(--muted)] hover:text-white hover:bg-white/10 border border-transparent"
          }`}
          title="Copy to clipboard"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[11px] leading-relaxed text-slate-200 break-words whitespace-pre-wrap selection:bg-[var(--accent)] selection:text-black">
        {code}
      </pre>
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
