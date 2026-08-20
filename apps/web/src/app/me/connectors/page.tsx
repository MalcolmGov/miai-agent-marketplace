"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ConnectorStatus = {
  connector: string;
  connected: boolean;
  updatedAt: string | null;
};

// Consumer-facing labels for the connectors the personal assistant uses. Both are Google.
const META: Record<string, { name: string; desc: string; icon: string }> = {
  email: {
    name: "Gmail",
    desc: "Lets your assistant triage your inbox and draft replies — nothing is sent without your say-so.",
    icon: "✉️",
  },
  google_calendar: {
    name: "Google Calendar",
    desc: "Lets your assistant see what's on and create or move events you confirm.",
    icon: "📅",
  },
  google_tasks: {
    name: "Google Tasks",
    desc: "Lets your assistant keep your to-do list in Google Tasks — add, list and complete tasks.",
    icon: "✅",
  },
  google_contacts: {
    name: "Google Contacts",
    desc: "Lets your assistant look up people by name so it emails or messages the right person.",
    icon: "👤",
  },
  google_drive: {
    name: "Google Drive",
    desc: "Lets your assistant find and read your files and documents. Read-only.",
    icon: "📁",
  },
  youtube: {
    name: "YouTube",
    desc: "Lets your assistant search YouTube for videos, tutorials and clips. Read-only.",
    icon: "▶️",
  },
  notion: {
    name: "Notion",
    desc: "Lets your assistant search your Notion notes, pages and docs. Read-only.",
    icon: "📝",
  },
  spotify: {
    name: "Spotify",
    desc: "Lets your assistant play, pause and tell you what's playing on Spotify.",
    icon: "🎵",
  },
};

function labelFor(connector: string) {
  return META[connector] ?? { name: connector, desc: "", icon: "🔌" };
}

export default function ConsumerConnectorsPage() {
  const [items, setItems] = useState<ConnectorStatus[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [justConnected, setJustConnected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/consumer/connectors");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't load your connected accounts.");
      setItems([]);
      return;
    }
    setError(null);
    setItems(data.connectors ?? []);
  }, []);

  useEffect(() => {
    void refresh();
    fetch("/api/consumer/wallet")
      .then((r) => r.json())
      .then((d) => setBalance(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const c = params.get("connected");
    if (c) setJustConnected(c);
  }, [refresh]);

  async function connect(connector: string) {
    setBusy(connector);
    setError(null);
    try {
      const returnTo = encodeURIComponent(`/me/connectors?connected=${connector}`);
      const res = await fetch(
        `/api/consumer/connectors/${connector}/start?format=json&returnTo=${returnTo}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 503
            ? "Connecting isn't enabled in this environment yet."
            : (data.error ?? "Couldn't start the connection."),
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start the connection.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(connector: string) {
    setBusy(connector);
    setError(null);
    try {
      await fetch(`/api/consumer/connectors/${connector}/disconnect`, { method: "POST" });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const allConnected = !!items && items.length > 0 && items.every((i) => i.connected);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/me"
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--accent)] underline decoration-1 underline-offset-2 hover:opacity-80"
          >
            <span aria-hidden>←</span> Back to assistant
          </Link>
          <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
            Connect your accounts
          </h1>
          <p className="mt-2 max-w-prose text-sm text-[var(--muted)]">
            Link your Google account so your assistant can work with your real inbox and calendar.
            Your data stays yours — the assistant never sends an email or changes your calendar
            without confirming with you first.
          </p>
        </div>
        {balance !== null ? (
          <span className="chip whitespace-nowrap" title="Your prepaid balance">
            {balance.toLocaleString()} tokens
          </span>
        ) : null}
      </header>

      {allConnected ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4 text-sm text-[var(--text)]">
          You&apos;re all set — your assistant can use your Gmail and Calendar.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--warn)_40%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] p-3 text-sm text-[var(--warn)]">
          {error}
        </div>
      ) : null}

      {items === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const meta = labelFor(item.connector);
            const isBusy = busy === item.connector;
            return (
              <li
                key={item.connector}
                className="rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-elev)_40%,transparent)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span aria-hidden className="text-xl leading-none">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text)]">
                          {meta.name}
                        </span>
                        {item.connected ? (
                          <span className="chip chip-live">Connected</span>
                        ) : justConnected === item.connector ? (
                          <span className="chip">Connecting…</span>
                        ) : (
                          <span className="chip opacity-70">Not connected</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--muted)]">{meta.desc}</p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {item.connected ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => disconnect(item.connector)}
                        className="btn btn-ghost inline-flex h-9 min-w-[7.5rem] items-center justify-center px-3 text-xs"
                      >
                        {isBusy ? "…" : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => connect(item.connector)}
                        className="btn btn-primary inline-flex h-9 min-w-[7.5rem] items-center justify-center px-3 text-xs"
                      >
                        {isBusy ? "…" : `Connect ${meta.name}`}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-[var(--muted)]">
        You can disconnect at any time — that removes your stored access and your assistant stops
        using that account immediately.
      </p>
    </div>
  );
}
