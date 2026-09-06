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
function IconChat({ className = "h-3.5 w-3.5" }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSparkles({ className = "h-3.5 w-3.5" }: Readonly<{ className?: string }>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export function ConsumerNav() {
  const pathname = usePathname();
  const isAssistant = pathname === "/me" || pathname?.startsWith("/me/");
  const isAgents = pathname === "/personal" || pathname?.startsWith("/personal/");

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
          <nav className="hidden gap-1.5 sm:flex" aria-label="Consumer views">
            <Link
              href="/me"
              aria-current={isAssistant ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                isAssistant
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-bright)] font-semibold"
                  : "border-transparent text-[var(--muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              }`}
            >
              <IconChat />
              <span>Assistant</span>
            </Link>
            <Link
              href="/personal"
              aria-current={isAgents ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                isAgents
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-bright)] font-semibold"
                  : "border-transparent text-[var(--muted)] hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
              }`}
            >
              <IconSparkles />
              <span>Agents</span>
            </Link>
          </nav>
          {/* Mobile: compact icon-only */}
          <nav className="flex gap-1 sm:hidden" aria-label="Consumer views">
            <Link
              href="/me"
              aria-current={isAssistant ? "page" : undefined}
              className={`rounded-lg border p-2 text-xs transition ${
                isAssistant
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-bright)]"
                  : "border-transparent text-[var(--muted)] hover:bg-[var(--bg-elev)]"
              }`}
              aria-label="Assistant chat"
            >
              <IconChat className="h-4 w-4" />
            </Link>
            <Link
              href="/personal"
              aria-current={isAgents ? "page" : undefined}
              className={`rounded-lg border p-2 text-xs transition ${
                isAgents
                  ? "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent-bright)]"
                  : "border-transparent text-[var(--muted)] hover:bg-[var(--bg-elev)]"
              }`}
              aria-label="Agent marketplace"
            >
              <IconSparkles className="h-4 w-4" />
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