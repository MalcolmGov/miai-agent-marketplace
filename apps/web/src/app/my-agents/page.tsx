"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { rentalStatusLabel } from "@/components/SetupGuide";

interface RentalItem {
  agentId: string;
  name: string;
  summary: string;
  state: string;
  tier: string;
  market: string | null;
  connectedConnectors: string[];
  rentedAt: string | null;
  readiness?: { ready: boolean; missing: { connector: string; name: string; tools: string[] }[] };
}

export default function MyAgentsPage() {
  const [items, setItems] = useState<RentalItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rentals")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load rentals");
        setItems(data.items ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
          My Agents
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Agents you&apos;ve rented in this workspace — open one to continue setup, Actions, or chat.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-[var(--danger)]/40 px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {items === null ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="panel space-y-3 p-6">
          <p className="text-sm text-[var(--text)]">No rented agents yet.</p>
          <p className="text-sm text-[var(--muted)]">
            Browse the catalogue, open an agent, and use <strong>Rent &amp; configure</strong> — then
            follow the setup guide.
          </p>
          <Link href="/#catalogue" className="btn btn-primary inline-flex">
            Browse agents
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.agentId}>
              <Link
                href={`/agents/${item.agentId}`}
                className="panel panel-interactive flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text)]">{item.name}</h2>
                    <span className="chip chip-live">{rentalStatusLabel(item.state)}</span>
                    <span className="chip">{item.tier}</span>
                    {item.market ? (
                      <span className="chip">{String(item.market).toUpperCase()}</span>
                    ) : null}
                    {item.readiness && !item.readiness.ready ? (
                      <span className="rounded-md bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--warn)]">
                        Needs setup
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{item.summary}</p>
                  {item.readiness && !item.readiness.ready ? (
                    <p className="mt-1 text-[11px] font-medium text-[var(--warn)]">
                      Connect to go live: {item.readiness.missing.map((m) => m.name).join(", ")}
                    </p>
                  ) : item.connectedConnectors.length > 0 ? (
                    <p className="mt-1 text-[11px] text-[var(--muted-dim)]">
                      Connected: {item.connectedConnectors.join(", ")}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-semibold text-[var(--accent-bright)]">
                  Open setup →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
