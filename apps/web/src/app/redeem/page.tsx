import type { Metadata } from "next";

export const metadata: Metadata = { title: "Redeem e-PIN — MyInstantAI" };

export default function RedeemPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 pb-10">
      <header className="space-y-1 pt-2 text-center">
        <div aria-hidden className="mx-auto mb-2 text-3xl">🎁</div>
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">Redeem your e-PIN</h1>
        <p className="text-sm text-[var(--card-body)]">Enter the 16-digit code from your card or receipt — tokens land in your balance instantly.</p>
      </header>
      <section className="panel space-y-4 p-6">
        <input
          type="text"
          inputMode="numeric"
          placeholder="XXXX  XXXX  XXXX  XXXX"
          aria-label="e-PIN code"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] px-4 py-3 text-center font-mono text-lg tracking-widest text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <button type="button" className="btn btn-primary w-full justify-center">Redeem</button>
        <p className="text-center text-xs text-[var(--muted)]">No card yet? Buy an e-PIN at 75,000+ stores worldwide.</p>
      </section>
    </div>
  );
}
