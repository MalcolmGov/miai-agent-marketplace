import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "My Tokens — MyInstantAI" };

export default function TokensPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <header className="space-y-1 pt-2">
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">My Tokens</h1>
        <p className="text-sm text-[var(--card-body)]">Your prepaid balance and usage. Tokens never expire.</p>
      </header>
      <section className="panel p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Token balance</p>
        <p className="mt-2 font-mono text-4xl font-semibold tabular-nums tracking-tight text-[var(--text)]">11,716</p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link href="/redeem" className="btn btn-primary">Redeem an e-PIN →</Link>
          <Link href="/learn" className="btn">Earn tokens →</Link>
        </div>
      </section>
      <p className="text-sm text-[var(--muted)]">Usage history is coming soon.</p>
    </div>
  );
}
