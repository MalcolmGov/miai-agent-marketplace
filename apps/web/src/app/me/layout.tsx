"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_BRAND_ID, getBrand, brandThemeVars, type Brand } from "@/lib/tenant-brands";

/**
 * Consumer surface layout — the white-label "my assistant" home, distinct from the B2B
 * marketplace shell. No catalogue sidebar, no marketplace chrome: just the assistant, their
 * agents, channels, and balance. Brand is fixed by tenant in a real deployment; the preview
 * switcher lives on the chat page only.
 */

const NAV = [
  { href: "/me", label: "Chat", icon: "💬" },
  { href: "/me/agents", label: "Agents", icon: "✨" },
  { href: "/me/channels", label: "Channels", icon: "🔗" },
  { href: "/me/topup", label: "Top up", icon: "⚡" },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [brand, setBrand] = useState<Brand>(getBrand(DEFAULT_BRAND_ID));

  // Re-skin on mount (mirrors the chat page's brand preview; default = MyInstantAI).
  useEffect(() => {
    try {
      const stored = localStorage.getItem("miai:me:brand:v1");
      if (stored) setBrand(getBrand(stored));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      className="brand-scope mx-auto flex min-h-screen w-full max-w-2xl flex-col"
      style={brandThemeVars(brand)}
    >
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg-panel)]/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-0 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link href="/me" className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {brand.name.charAt(0)}
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
              {brand.name} <span className="text-[var(--muted)]">Assistant</span>
            </span>
          </Link>
          <Link
            href="/me/topup"
            className="chip !px-2.5 !py-1 text-xs"
            title="View or top up your prepaid balance"
          >
            ⚡ Balance
          </Link>
        </div>
        <nav className="mt-2 flex gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                <span aria-hidden className="text-xs">
                  {n.icon}
                </span>
                {n.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: "var(--accent)" }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[var(--line)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <p className="text-center text-[11px] text-[var(--muted)]">
          {brand.name} Assistant · metered to your prepaid balance
        </p>
      </footer>
    </div>
  );
}
