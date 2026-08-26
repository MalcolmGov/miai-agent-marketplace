"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ConnectorIcon } from "@/components/ConnectorIcon";
import { CONNECTOR_LABEL } from "@/lib/assistant-capabilities";
import { DEFAULT_BRAND_ID } from "@/lib/tenant-brands";

type ConnectorStatus = { connector: string; connected: boolean };

/**
 * Shared consumer account bar — connected accounts · Telegram channel.
 *
 * These are ACCOUNT-level (shared across every agent, not tied to any one assistant), so this
 * renders consistently above the assistants grid rather than being buried inside a single agent.
 * Self-contained: fetches its own connectors / Telegram status, scoped to the fixed tenant. The
 * prepaid balance lives in the sidebar, so it's intentionally not duplicated here.
 */
export function ConsumerAccountBar() {
  const ws = `?workspaceId=${encodeURIComponent(DEFAULT_BRAND_ID)}`;
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [telegram, setTelegram] = useState<{ enabled: boolean; connected: boolean }>({
    enabled: false,
    connected: false,
  });
  const [tgBusy, setTgBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/consumer/connectors${ws}`)
      .then((r) => r.json())
      .then((d) => setConnectors(Array.isArray(d?.connectors) ? d.connectors : []))
      .catch(() => {});
  }, [ws]);

  const refreshTelegram = useCallback(() => {
    fetch(`/api/consumer/telegram/connect${ws}`)
      .then((r) => r.json())
      .then((d) => setTelegram({ enabled: Boolean(d?.enabled), connected: Boolean(d?.connected) }))
      .catch(() => {});
  }, [ws]);

  useEffect(() => {
    refreshTelegram();
  }, [refreshTelegram]);

  /** Link Telegram: mint a deep link, open it, then poll so the control flips once they press Start. */
  async function connectTelegram() {
    setTgBusy(true);
    try {
      const r = await fetch(`/api/consumer/telegram/connect${ws}`, { method: "POST" });
      const d = await r.json();
      if (d?.url) window.open(d.url, "_blank", "noopener,noreferrer");
      let tries = 0;
      const iv = setInterval(() => {
        if (++tries > 10) return clearInterval(iv);
        refreshTelegram();
      }, 3000);
    } catch {
      /* ignore — the user can retry */
    } finally {
      setTgBusy(false);
    }
  }

  /** Disconnect Telegram: unlink every chat bound to this consumer. */
  async function disconnectTelegram() {
    setTgBusy(true);
    try {
      await fetch(`/api/consumer/telegram/disconnect${ws}`, { method: "POST" });
      setTelegram((t) => ({ ...t, connected: false }));
    } catch {
      /* ignore — the user can retry */
    } finally {
      setTgBusy(false);
    }
  }

  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-2.5 p-3.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--muted)]">Accounts:</span>
        {connectors.length === 0 ? (
          <span className="text-[var(--muted)]">—</span>
        ) : (
          connectors.map((c) => (
            <span key={c.connector} className={`chip ${c.connected ? "chip-live" : "opacity-70"}`}>
              <ConnectorIcon connector={c.connector} size={13} />
              {CONNECTOR_LABEL[c.connector] ?? c.connector}
              {c.connected ? " ✓" : ""}
            </span>
          ))
        )}
        <Link
          href="/me/connectors"
          className="ml-0.5 text-[var(--muted)] underline decoration-1 underline-offset-2 hover:text-[var(--text)]"
        >
          Manage
        </Link>
      </div>

      {telegram.enabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[var(--muted)]">Channels:</span>
          {telegram.connected ? (
            <>
              <span className="chip chip-live inline-flex items-center gap-1.5">
                <span aria-hidden>✈️</span> Telegram connected ✓
              </span>
              <button
                type="button"
                onClick={disconnectTelegram}
                disabled={tgBusy}
                className="text-[var(--muted)] underline decoration-1 underline-offset-2 transition hover:text-[var(--text)] disabled:opacity-60"
              >
                {tgBusy ? "…" : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connectTelegram}
              disabled={tgBusy}
              className="chip inline-flex items-center gap-1.5 transition hover:text-[var(--text)] disabled:opacity-60"
            >
              <span aria-hidden>✈️</span> {tgBusy ? "Opening Telegram…" : "Connect Telegram"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
