"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TopUpModal } from "./TopUpModal";

const NAV = [
  { href: "/", label: "Agents" },
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight text-[var(--text)]">
                MyInstant<span className="text-[var(--accent)]">AI</span>
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Agents
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((n) => {
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-[var(--bg-elev)] text-[var(--accent)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTopUpOpen(true)}
              className="chip hover:border-[var(--accent-dim)]"
            >
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {tokens === null ? "…" : `${tokens.toLocaleString()} tokens`}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setTopUpOpen(true)}>
              Top up
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
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
