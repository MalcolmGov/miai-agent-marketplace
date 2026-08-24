"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Lightweight consumer nav — a minimal top bar rendered on the white-label consumer
 * surfaces (/me, /personal) when the B2B marketplace chrome is removed by Shell.tsx.
 *
 * Provides persistent navigation between the assistant chat, the agent marketplace,
 * and a back-link to the business side, so removing the sidebar doesn't strand users.
 */
export function ConsumerNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg-panel)]/85 px-4 py-2.5 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/me"
            className="text-sm font-semibold tracking-tight text-[var(--text)]"
          >
            MyInstant
            <span className="text-[var(--accent-bright)]">AI</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            <Link
              href="/me"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/me" || pathname?.startsWith("/me/")
                  ? "bg-[var(--accent-dim)]/20 text-[var(--accent-bright)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              💬 Assistant
            </Link>
            <Link
              href="/personal"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                pathname === "/personal" || pathname?.startsWith("/personal/")
                  ? "bg-[var(--accent-dim)]/20 text-[var(--accent-bright)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              ✨ Agents
            </Link>
          </nav>
          {/* Mobile: compact icon-only */}
          <nav className="flex gap-1 sm:hidden">
            <Link
              href="/me"
              className={`rounded-lg p-2 text-xs ${
                pathname === "/me" || pathname?.startsWith("/me/")
                  ? "text-[var(--accent-bright)]"
                  : "text-[var(--muted)]"
              }`}
              aria-label="Assistant chat"
            >
              💬
            </Link>
            <Link
              href="/personal"
              className={`rounded-lg p-2 text-xs ${
                pathname === "/personal" || pathname?.startsWith("/personal/")
                  ? "text-[var(--accent-bright)]"
                  : "text-[var(--muted)]"
              }`}
              aria-label="Agent marketplace"
            >
              ✨
            </Link>
          </nav>
        </div>
        <Link
          href="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          Business →
        </Link>
      </div>
    </header>
  );
}