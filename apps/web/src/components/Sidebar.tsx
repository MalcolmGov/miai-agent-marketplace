"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { MessageKey } from "@/lib/i18n";
import { useT } from "@/lib/locale";
import { LanguageSelect } from "./LanguageSelect";
import { ThemeToggle } from "./ThemeToggle";

type NavBadge = { labelKey: MessageKey; tone: "new" | "live" };

type NavItem = {
  href: string;
  id: string;
  labelKey: MessageKey;
  icon: ReactNode;
  badge?: NavBadge;
  exact?: boolean;
};

type NavGroup = { titleKey: MessageKey; id: string; items: NavItem[] };

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        strokeLinecap="round"
      />
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
      <path d="M4 12a8 8 0 1 0 2.3-5.6" strokeLinecap="round" />
      <path d="M4 5v4h4M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
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

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconOps() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M4 14h4l2-5 3 8 2-4h5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="7" r="2" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" strokeLinecap="round" />
    </svg>
  );
}

function IconSupport() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path
        d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-1v-6h3M4 13h3v6H6a2 2 0 0 1-2-2v-4Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" strokeLinecap="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconRoadmap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M5 6h10l4 3-4 3H5V6ZM5 15h8l3 2.5L13 20H5v-5Z" strokeLinejoin="round" />
    </svg>
  );
}

function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M4 7.5 12 4l8 3.5v8L12 19l-8-3.5v-8Z" strokeLinejoin="round" />
      <path d="M12 19V11" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

const GROUPS: NavGroup[] = [
  {
    id: "core",
    titleKey: "nav.core",
    items: [
      { id: "home", href: "/", labelKey: "nav.home", icon: <IconHome />, exact: true },
      { id: "ask", href: "/ask", labelKey: "nav.askAi", icon: <IconSpark /> },
      { id: "search", href: "/#catalogue", labelKey: "nav.search", icon: <IconSearch /> },
      { id: "history", href: "/history", labelKey: "nav.history", icon: <IconHistory /> },
      { id: "workspace", href: "/workspace", labelKey: "nav.workspace", icon: <IconAdmin /> },
    ],
  },
  {
    id: "agents",
    titleKey: "nav.agents",
    items: [
      {
        id: "ai-agents",
        href: "/",
        labelKey: "nav.aiAgents",
        icon: <IconAgents />,
        badge: { labelKey: "nav.badgeNew", tone: "new" },
        exact: true,
      },
      { id: "my-agents", href: "/my-agents", labelKey: "nav.myAgents", icon: <IconGrid /> },
      {
        id: "live-ops",
        href: "/ops",
        labelKey: "nav.liveOps",
        icon: <IconOps />,
        badge: { labelKey: "nav.badgeLive", tone: "live" },
      },
      { id: "insights", href: "/insights", labelKey: "nav.insights", icon: <IconChart /> },
      { id: "support", href: "/support", labelKey: "nav.supportDesk", icon: <IconSupport /> },
      { id: "admin", href: "/admin", labelKey: "nav.agentAdmin", icon: <IconAdmin /> },
      { id: "trust", href: "/trust", labelKey: "nav.trust", icon: <IconShield /> },
      { id: "roadmap", href: "/roadmap", labelKey: "nav.roadmap", icon: <IconRoadmap /> },
      {
        id: "demo",
        href: "/demo",
        labelKey: "nav.mondayDemo",
        icon: <IconRoadmap />,
        badge: { labelKey: "nav.badgeNew", tone: "new" },
      },
    ],
  },
  {
    id: "growth",
    titleKey: "nav.growth",
    items: [
      { id: "learn", href: "/learn", labelKey: "nav.learnEarn", icon: <IconLearn /> },
      { id: "create", href: "/create", labelKey: "nav.create", icon: <IconPlus /> },
    ],
  },
];

function resolveActive(pathname: string, item: NavItem, groupId: string) {
  if (item.href.includes("#")) return false;
  if (pathname === "/" && item.href === "/") {
    return groupId === "agents" && item.id === "ai-agents";
  }
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
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
  const t = useT();
  const [mode, setMode] = useState<"consumer" | "workspaces">("consumer");

  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? "sidebar-backdrop-open" : ""}`}
        onClick={onClose}
        aria-hidden={!mobileOpen}
      />
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="flex h-full flex-col">
          <div className="border-b border-[var(--line)] px-4 pb-4 pt-5">
            <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg-elev))]">
                <span className="text-xs font-bold tracking-tight text-[var(--accent-bright)]">M</span>
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-sm bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
              </span>
              <span className="text-[0.95rem] font-semibold tracking-tight text-[var(--text)]">
                myinstant<span className="text-[var(--accent-bright)]">ai</span>
              </span>
            </Link>

            <div className="mode-toggle mt-4" role="group" aria-label={t("sidebar.accountMode")}>
              <button
                type="button"
                className={mode === "consumer" ? "mode-active" : ""}
                onClick={() => setMode("consumer")}
              >
                {t("sidebar.consumer")}
              </button>
              <button
                type="button"
                className={mode === "workspaces" ? "mode-active" : ""}
                onClick={() => setMode("workspaces")}
              >
                {t("sidebar.workspaces")}
              </button>
            </div>

            <button type="button" onClick={onTopUp} className="token-card mt-4 w-full text-left">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {t("sidebar.tokenBalance")}
                </span>
                <span className="chip chip-live !py-0.5 !text-[9px]">{t("sidebar.prepaid")}</span>
              </div>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums text-[var(--text)]">
                {tokens === null ? "…" : tokens.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted-dim)]">{t("sidebar.tapToTopUp")}</p>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {GROUPS.map((group) => (
              <div key={group.id} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                  {t(group.titleKey)}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = resolveActive(pathname, item, group.id);
                    return (
                      <li key={`${group.id}-${item.id}`}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`nav-item ${active ? "nav-item-active" : ""}`}
                        >
                          <span className="nav-item-icon">{item.icon}</span>
                          <span className="flex-1 truncate">{t(item.labelKey)}</span>
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

          <div className="space-y-2 border-t border-[var(--line)] px-4 py-3">
            <LanguageSelect />
            <ThemeToggle />
            <Link href="/install" onClick={onClose} className="nav-item text-[var(--muted)]">
              <span className="nav-item-icon">
                <IconPlus />
              </span>
              <span>{t("sidebar.installEmbed")}</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
