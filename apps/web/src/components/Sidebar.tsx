"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/locale";

type ShellMode = "business" | "consumer";

const BUSINESS_HIDDEN = new Set(["learn", "live-ops", "quality"]);
/** Consumer shell: prepaid chat only — Agents catalogue/ops are a Business product. */
const CONSUMER_ALLOWED = new Set([
  "home", "ask", "ai-agents-marketplace", "my-agents", "search", "history",
  "learn", "my-tokens", "redeem-epin", "subscriptions", "consultants", "settings", "help",
]);
/** Entire nav groups hidden in consumer mode (Agents ops are a Business product). */
const CONSUMER_HIDDEN_GROUPS = new Set(["agents"]);

type NavBadge = { labelKey: MessageKey; tone: "new" | "live" };

type NavItem = {
  href: string;
  id: string;
  labelKey?: MessageKey;
  label?: string;
  icon: ReactNode;
  badge?: NavBadge;
  exact?: boolean;
};

type NavGroup = { titleKey?: MessageKey; title?: string; id: string; items: NavItem[] };

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" />
    </svg>
  );
}

function IconAtomLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <g stroke="#2ec4b6" strokeWidth="1.5">
        <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(150 12 12)" />
      </g>
      <path d="M12 9.2 Q12 12 14.8 12 Q12 12 12 14.8 Q12 12 9.2 12 Q12 12 12 9.2 Z" fill="#2ec4b6" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.2 7l2 1.2M17.8 15.8l2 1.2M4.2 17l2-1.2M17.8 8.2l2-1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconGift() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconTokens() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <rect x="7" y="7" width="14" height="10" rx="2" />
      <circle cx="16.5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

function IconAsk() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.2-3.2" strokeLinecap="round" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="12" cy="12" r="8" />
      <polyline points="12 7 12 12 15 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAgents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="4" y="5" width="16" height="12" rx="2" />
      <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 17v2M15 17v2M8 21h8" strokeLinecap="round" />
    </svg>
  );
}

function IconMyAgents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="4" y="5" width="16" height="13" rx="3" />
      <circle cx="9" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 2v3M8 15h8M2 12h2M20 12h2" strokeLinecap="round" />
      <path d="M8.5 14.5c1 .8 2.5 1.2 3.5 1.2s2.5-.4 3.5-1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" strokeLinecap="round" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" strokeLinecap="round" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" strokeLinecap="round" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" strokeLinecap="round" />
    </svg>
  );
}

function IconDots() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinejoin="round" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}

const GROUPS: NavGroup[] = [
  {
    id: "core",
    title: "CORE",
    items: [
      { id: "home", href: "/", label: "Home", icon: <IconHome />, exact: true },
      { id: "ask", href: "/ask", label: "Ask AI", icon: <IconAsk /> },
      {
        id: "ai-agents-marketplace",
        href: "/agents",
        label: "AI Agent Marketplace",
        icon: <IconAgents />,
        badge: { labelKey: "nav.badgeNew", tone: "new" },
      },
      {
        id: "my-agents",
        href: "/my-agents",
        label: "My Agents",
        icon: <IconMyAgents />,
      },
      { id: "search", href: "/ask?search=true", label: "Search", icon: <IconSearch /> },
      { id: "history", href: "/history", label: "History", icon: <IconHistory /> },
    ],
  },
  {
    id: "growth",
    title: "GROWTH",
    items: [
      { id: "learn", href: "/learn", label: "Learn & Earn", icon: <IconLearn /> },
    ],
  },
  {
    id: "tokens",
    title: "TOKENS",
    items: [
      { id: "my-tokens", href: "/tokens", label: "My Tokens", icon: <IconTokens /> },
      { id: "redeem-epin", href: "/redeem", label: "Redeem e-PIN", icon: <IconGift /> },
      { id: "subscriptions", href: "/tokens#subscriptions", label: "Subscriptions", icon: <IconCard /> },
    ],
  },
  {
    id: "system",
    items: [
      { id: "settings", href: "/settings", label: "Settings", icon: <IconGear /> },
      { id: "help", href: "/support", label: "Help & Support", icon: <IconHelp /> },
    ],
  },
];

function resolveActive(
  pathname: string,
  activeTab: string | null,
  item: NavItem,
  groupId: string,
) {
  if (item.href.includes("#")) return false;
  if ((pathname === "/" || pathname === "/dashboard") && item.href === "/") {
    return groupId === "core" && item.id === "home";
  }
  // Read the ?tab= query via useSearchParams (threaded in as activeTab), NOT window.location during
  // render — the latter is undefined on the server and set on the client, which produced a hydration
  // mismatch on /my-agents?tab=insights (server & client disagreed on which item was active).
  if (item.id === "insights") {
    return pathname === "/insights" || (pathname === "/my-agents" && activeTab === "insights");
  }
  if (item.id === "my-agents") {
    return pathname === "/my-agents" && activeTab !== "insights";
  }
  if (item.id === "ai-agents-marketplace") {
    return pathname === "/agents" || (pathname.startsWith("/agents/") && !pathname.startsWith("/agents/v1/"));
  }
  if (item.exact) return pathname === item.href;
  const targetBase = item.href.split("?")[0];
  return pathname === targetBase || pathname.startsWith(`${targetBase}/`);
}

function platformOperator(roles: string[]): boolean {
  return roles.some((r) =>
    ["operator", "platform_admin", "miai_admin"].includes(r.toLowerCase()),
  );
}

export function Sidebar({
  tokens,
  onTopUp,
  mobileOpen,
  onClose,
}: {
  tokens: number | null;
  onTopUp: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const t = useT();
  const [mode, setMode] = useState<ShellMode>(() =>
    pathname === "/personal" || pathname.startsWith("/personal/") ? "consumer" : "business",
  );
  const [showAdmin, setShowAdmin] = useState(false);
  const [username, setUsername] = useState<string>("malcolmgov24");
  const [, setConsumerAppUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [onboardingRes, handoffRes] = await Promise.all([
          fetch("/api/onboarding"),
          fetch("/api/auth/handoff"),
        ]);
        if (cancelled) return;
        if (handoffRes.ok) {
          const handoff = await handoffRes.json();
          setConsumerAppUrl(handoff.consumerAppUrl ?? null);
        }
        if (!onboardingRes.ok) return;
        const data = await onboardingRes.json();
        const roles: string[] = data.me?.roles ?? [];
        const isOp = Boolean(data.me?.isOperator) || platformOperator(roles);
        setShowAdmin(isOp);
        if (data.me?.username) {
          setUsername(data.me.username);
        } else if (data.me?.userId && !data.me.userId.startsWith("user_")) {
          setUsername(data.me.userId);
        }
        let stored: string | null = null;
        try {
          stored = sessionStorage.getItem("miai.shellMode");
          if (!stored && sessionStorage.getItem("miai.product") === "agents") {
            stored = "business";
          }
        } catch {
          /* ignore */
        }
        // A stored preference wins; otherwise keep the mount-time default computed
        // in useState (consumer on /personal, business elsewhere).
        if (stored === "consumer" || stored === "business") {
          setMode(stored);
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGroups = useMemo(() => {
    return GROUPS.map((group) => {
      if (mode === "consumer" && CONSUMER_HIDDEN_GROUPS.has(group.id)) {
        return { ...group, items: [] as NavItem[] };
      }
      const items = group.items.filter((item) => {
        if (item.id === "admin") return mode === "business" && showAdmin;
        if (mode === "business") return !BUSINESS_HIDDEN.has(item.id);
        return CONSUMER_ALLOWED.has(item.id);
      });
      return { ...group, items };
    }).filter((g) => g.items.length > 0);
  }, [mode, showAdmin]);

  /** Consumer home is the /personal marketplace — catalogue `/` is Business-only. */
  function navHref(item: NavItem): string {
    if (mode === "consumer" && item.id === "home") return "/personal";
    return item.href;
  }

  const logoHref = mode === "consumer" ? "/personal" : "/";
  const asideRef = useRef<HTMLElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isDesktop || !mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop, mobileOpen, onClose]);

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? "sidebar-backdrop-open" : ""}`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />
      <aside
        ref={asideRef}
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
        data-testid="app-sidebar"
        aria-hidden={!isDesktop && !mobileOpen}
        inert={!isDesktop && !mobileOpen ? true : undefined}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--line)] px-4 pb-4 pt-5">
            <div className="flex items-center justify-between">
              <Link href={logoHref} className="group flex items-center gap-2" onClick={onClose}>
                <IconAtomLogo className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:scale-105" />
                <span className="text-[1.1rem] font-bold italic tracking-tight text-[var(--accent)]">
                  myinstantai
                </span>
              </Link>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--muted-dim)] transition-colors hover:bg-[var(--bg-elev)] hover:text-[var(--text)]"
                onClick={onClose}
                aria-label="Collapse navigation"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={onTopUp}
              className="token-card group mt-4 w-full text-left cursor-pointer transition-all duration-200 border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--bg-panel)_85%,transparent)] p-3 rounded-xl shadow-sm hover:border-[var(--accent)]"
              title="Tap to top up tokens"
              data-testid="sidebar-token-card"
            >
              <div className="card-specular-rim" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[var(--muted)]">
                  Token Balance
                </span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--accent-bright)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
                  FOREVER
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="font-mono text-2xl font-bold tracking-tight tabular-nums text-white">
                  {tokens === null ? "11,716" : tokens.toLocaleString()}
                </p>
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_color-mix(in_srgb,var(--accent)_80%,transparent)]" />
              </div>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" data-testid="sidebar-nav">
            {visibleGroups.map((group) => (
              <div
                key={group.id}
                className={
                  group.title || group.titleKey
                    ? "mb-5"
                    : "mb-5 border-t border-[var(--line)] pt-4"
                }
              >
                {group.title || group.titleKey ? (
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                    {group.title ?? (group.titleKey ? t(group.titleKey) : "")}
                  </p>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const href = navHref(item);
                    const active =
                      mode === "consumer" && item.id === "home"
                        ? pathname === "/personal" || pathname.startsWith("/personal/")
                        : resolveActive(pathname, activeTab, item, group.id);
                    return (
                      <li key={`${group.id}-${item.id}`}>
                        <Link
                          href={href}
                          onClick={onClose}
                          className={`nav-item ${active ? "nav-item-active" : ""}`}
                          data-nav-id={item.id}
                        >
                          <span className="nav-item-icon">{item.icon}</span>
                          <span className="flex-1 truncate">{item.label ?? (item.labelKey ? t(item.labelKey) : "")}</span>
                          {item.badge ? (
                            <span
                              className={`nav-badge ${
                                item.badge.tone === "live" ? "nav-badge-live" : "nav-badge-new"
                              }`}
                            >
                              {item.badge.tone === "live" ? (
                                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                              ) : null}
                              {t(item.badge.labelKey)}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--line)] px-3 py-3">
            <button
              type="button"
              className="group flex w-full items-center gap-2.5 rounded-xl border border-transparent p-2 text-left transition-all duration-200 hover:border-[var(--line)] hover:bg-[color-mix(in_srgb,var(--bg-panel-hover)_75%,transparent)]"
              data-testid="sidebar-account"
            >
              <div className="relative flex-shrink-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)] shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--accent)_60%,transparent)]">
                  {(username[0] || "M").toUpperCase()}
                </span>
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white group-hover:text-[var(--accent-bright)]">
                  {username}
                </span>
                <span className="block truncate text-[11px] font-medium text-[var(--muted)]">
                  {mode === "consumer" ? "Consumer plan" : "Workspaces plan"}
                </span>
              </span>
              <span className="p-1 text-[var(--muted-dim)] transition-colors group-hover:text-[var(--text)]" aria-hidden>
                <IconDots />
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
