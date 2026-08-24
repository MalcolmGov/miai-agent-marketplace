"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const PACKS = [
  { id: "10" as const, usd: 10, tokens: "150,000", note: "Casual use" },
  { id: "20" as const, usd: 20, tokens: "420,000", note: "Daily assistant (+5%)" },
  { id: "100" as const, usd: 100, tokens: "2,750,000", note: "Power user" },
  { id: "200" as const, usd: 200, tokens: "6,900,000", note: "Best value" },
];

export default function TopUpPage() {
  const [tokens, setTokens] = useState<number | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBalance = useCallback(() => {
    fetch("/api/consumer/wallet")
      .then((r) => r.json())
      .then((d) => setTokens(typeof d.tokens === "number" ? d.tokens : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  async function buy(packageId: string, usdAmount: number) {
    setBuying(packageId);
    setError(null);
    try {
      const res = await fetch("/api/consumer/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packageId, usdAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (typeof data.tokens === "number") setTokens(data.tokens);
    } catch {
      setError("Couldn't reach the wallet. Please try again.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">
          Top up
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          Your prepaid balance powers every agent. When it runs low, replies pause until you top
          up.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Current balance</p>
        <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
          {tokens === null ? "…" : tokens.toLocaleString()}
          <span className="ml-1.5 text-sm font-normal text-[var(--muted)]">tokens</span>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={buying !== null}
            onClick={() => buy(p.id, p.usd)}
            className="flex flex-col items-start rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-4 text-left transition hover:border-[var(--accent-dim)] disabled:opacity-60"
          >
            <span className="text-lg font-semibold text-[var(--text)]">${p.usd}</span>
            <span className="mt-0.5 font-mono text-sm text-[var(--accent)]">{p.tokens} tokens</span>
            <span className="mt-1 text-xs text-[var(--muted)]">{p.note}</span>
            <span className="mt-3 text-sm font-medium text-[var(--accent)]">
              {buying === p.id ? "Adding…" : "Add"}
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-[var(--warn)]">{error}</p> : null}

      <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">
        Same wallet as MyInstantAI general AI. In live mode, payment is handled by MyInstantAI&apos;s
        checkout; this demo adds tokens directly for testing.
      </p>

      <div className="mt-8 border-t border-[var(--line)] pt-5">
        <Link
          href="/me"
          className="text-sm text-[var(--accent)] underline decoration-1 underline-offset-2 hover:opacity-80"
        >
          ← Back to chat
        </Link>
      </div>
    </div>
  );
}
