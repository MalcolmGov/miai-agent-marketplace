"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TopUpModal } from "./TopUpModal";

const NAV = [
  { href: "/", label: "Marketplace" },
  { href: "/ops", label: "Live Ops" },
  { href: "/install", label: "Install" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tokens, setTokens] = useState<number | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);

  async function refreshWallet() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    setTokens(data.tokens);
  }

  useEffect(() => {
    refreshWallet();
  }, [pathname]);

  const isHome = pathname === "/";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-3">
              <span
                aria-hidden
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--bg-elev))]"
              >
                <span className="text-sm font-semibold tracking-tight text-[var(--accent-bright)]">
                  M
                </span>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-sm bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-[1.02rem] font-semibold tracking-tight text-[var(--text)]">
                  MyInstant<span className="text-[var(--accent-bright)]">AI</span>
                </span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                  Agent Marketplace
                </span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => {
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                      active
                        ? "text-[var(--accent-bright)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {n.label}
                    {active ? (
                      <span className="absolute inset-x-3 -bottom-[calc(0.875rem+1px)] h-0.5 rounded-full bg-[var(--accent)]" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="chip hidden hover:border-[var(--accent-dim)] sm:inline-flex"
            >
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-[11px] normal-case tracking-normal">
                {tokens === null ? "…" : tokens.toLocaleString()}
              </span>
              <span className="normal-case tracking-normal text-[var(--muted-dim)]">tokens</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setTopUpOpen(true)}>
              Top up
            </button>
          </div>
        </div>
      </header>
      <main className={`mx-auto max-w-7xl px-4 sm:px-6 ${isHome ? "pb-16 pt-0" : "py-8"}`}>
        {children}
      </main>
      <TopUpModal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        onDone={(t) => {
          setTokens(t);
          setTopUpOpen(false);
        }}
      />
    </div>
  );
}
