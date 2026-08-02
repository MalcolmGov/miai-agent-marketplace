"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConsentBanner } from "./ConsentBanner";
import { MarketplaceAssistant } from "./marketplace-assistant/MarketplaceAssistant";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { TopUpModal } from "./TopUpModal";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  async function refreshWallet() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    setTokens(data.tokens);
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
  /** Full-page Ask AI — skip floating FAB duplicate. */
  const isAskPage = pathname === "/ask" || pathname.startsWith("/ask/");

  if (isAppChannel) {
    return <>{children}</>;
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
              onClick={() => setMobileNav(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
                MyInstant<span className="text-[var(--accent-bright)]">AI</span>
              </span>
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div className="min-w-0 shrink lg:hidden">
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="chip !px-2 !py-1"
              title="Token balance — tap to top up"
            >
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-[11px] normal-case tracking-normal">
                {tokens === null ? "…" : tokens.toLocaleString()}
              </span>
              <span className="hidden normal-case tracking-normal text-[var(--muted-dim)] sm:inline">
                tokens
              </span>
            </button>
            <button
              type="button"
              className="btn btn-primary !px-2.5 !py-2 text-xs sm:!px-3 sm:text-sm"
              onClick={() => setTopUpOpen(true)}
            >
              Top up
            </button>
          </div>
        </header>

        <main className={`shell-content ${isHome ? "shell-content-home" : ""}`}>{children}</main>
        <footer className="border-t border-[var(--line-strong)] bg-[var(--bg-panel)] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-sm text-[var(--card-body)] sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:gap-x-5 sm:text-sm">
            <span className="w-full text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--card-meta)] sm:w-auto">
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
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--card-meta)] sm:text-xs">
            Draft notices · AI system disclosures on chat surfaces · counsel review pending
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
      <ConsentBanner />
    </div>
  );
}
