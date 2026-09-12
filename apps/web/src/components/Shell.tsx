"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ConsentBanner } from "./ConsentBanner";
import { MarketplaceAssistant } from "./marketplace-assistant/MarketplaceAssistant";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { ConsumerNav } from "./ConsumerNav";
import { TopUpModal } from "./TopUpModal";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modelMode, setModelMode] = useState<"single" | "compare" | "blend">("single");

  async function refreshWallet() {
    // Keep `tokens` honest to its number|null type: a non-numeric/absent balance
    // (e.g. the signed-out wallet response) must become null, not undefined —
    // otherwise `tokens.toLocaleString()` below throws and the layout (rendered on
    // every page) blanks with a client-side exception. Never fail on a bad fetch.
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      setTokens(typeof data?.tokens === "number" ? data.tokens : null);
    } catch {
      setTokens(null);
    }
  }

  useEffect(() => {
    refreshWallet();
  }, [pathname]);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  const isHome = pathname === "/";
  /** App channel hosted chat — no marketplace chrome (WebView / in-app). */
  const isAppChannel = pathname === "/app/v1" || pathname.startsWith("/app/v1/");
  /** White-label embed ("my assistant") — bare, no marketplace chrome.
   *  Note: /personal (the consumer marketplace) renders WITH the sidebar so the
   *  full MyInstantAI consumer nav is present, matching the real product. */
  const isConsumerSurface =
    pathname === "/me" || pathname.startsWith("/me/");
  /** Business onboarding / login / marketing preview — focused full-page, no sidebar. */
  const isAuthEntry =
    pathname === "/get-started" ||
    pathname.startsWith("/get-started/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/marketing" ||
    pathname.startsWith("/marketing/");
  /** Full-page Ask AI — skip floating FAB duplicate. */
  const isAskPage = pathname === "/ask" || pathname.startsWith("/ask/");

  if (isAppChannel || isAuthEntry) {
    return <>{children}</>;
  }

  if (isConsumerSurface) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-panel)]">
        <ConsumerNav />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar
        tokens={tokens}
        onTopUp={() => setTopUpOpen(true)}
        mobileOpen={mobileNav}
        onClose={() => setMobileNav(false)}
      />

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="shell-menu-btn"
              aria-label="Open navigation"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
                myinstant<span className="text-[var(--accent-bright)]">ai</span>
              </span>
            </Link>

            {/* Top Mode Selector Group matching app.myinstantai.com */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-[rgba(255,255,255,0.05)] p-0.5 border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setModelMode("single")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    modelMode === "single"
                      ? "bg-[var(--accent)] text-slate-950 font-semibold shadow-sm"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode("compare")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    modelMode === "compare"
                      ? "bg-[var(--accent)] text-slate-950 font-semibold shadow-sm"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Compare
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode("blend")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    modelMode === "blend"
                      ? "bg-[var(--accent)] text-slate-950 font-semibold shadow-sm"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Blend
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--line)] text-[var(--muted)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>Auto-Saver</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 opacity-60">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="chip !px-2.5 !py-1 text-xs font-mono"
              title="Token balance — tap to top up"
            >
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span>{tokens === null ? "11,716" : tokens.toLocaleString()}</span>
              <span className="hidden text-[var(--muted-dim)] sm:inline">tokens</span>
            </button>

            <ThemeToggle />

            {/* Notification Bell */}
            <button
              type="button"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* Settings shortcut */}
            <Link
              href="/settings"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
              aria-label="Settings"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>

            {/* Profile Avatar */}
            <Link
              href="/me"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-xs font-bold text-slate-950 shadow-sm hover:ring-2 hover:ring-[var(--accent)] transition-all"
              title="My Account"
            >
              M
            </Link>
          </div>
        </header>

        <main className={`shell-content ${isHome ? "shell-content-home" : ""}`}>{children}</main>
        <footer className="border-t border-[var(--line-strong)] bg-[color-mix(in_srgb,var(--bg-panel)_90%,transparent)] backdrop-blur-md px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-sm text-[var(--card-body)] sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:gap-x-5 sm:text-sm">
              <span className="w-full text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--card-meta)] sm:w-auto">
                Legal
              </span>
              <Link href="/legal" className="font-medium text-[var(--accent-bright)] hover:underline">
                Legal hub
              </Link>
              <Link href="/privacy" className="hover:text-[var(--text)] hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[var(--text)] hover:underline">
                Terms
              </Link>
              <Link href="/cookies" className="hover:text-[var(--text)] hover:underline">
                Cookies
              </Link>
              <Link href="/data-protection" className="hover:text-[var(--text)] hover:underline">
                Data protection
              </Link>
              <Link href="/trust" className="hover:text-[var(--text)] hover:underline">
                Trust Center
              </Link>
              <Link href="/quality" className="hover:text-[var(--text)] hover:underline">
                Live quality
              </Link>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 shadow-[0_0_12px_-3px_rgba(52,211,153,0.3)] sm:self-auto">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              <span>All Systems Operational</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--card-meta)] sm:text-xs">
            MyInstantAI · Enterprise Agent Infrastructure & White-Label Platform · Zero Customer Data Retention Policy
          </p>
        </footer>
      </div>

      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onDone={(t) => {
          setTokens(t);
          setTopUpOpen(false);
        }}
      />

      {!isAskPage && <MarketplaceAssistant mode="floating" />}
      {isHome ? (
        <Suspense fallback={null}>
          <OnboardingChecklist />
        </Suspense>
      ) : null}
      <ConsentBanner />
    </div>
  );
}
