import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consultants — MyInstantAI" };

export default function ConsultantsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <header className="space-y-1 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">Consultants</p>
        <h1 className="display text-2xl font-semibold tracking-tight text-[var(--text)]">Talk to a specialist</h1>
        <p className="text-sm text-[var(--card-body)]">
          Get hands-on help setting up agents, connecting your systems, or choosing the right plan — from a MyInstantAI consultant.
        </p>
      </header>
      <section className="panel p-6">
        <p className="text-sm text-[var(--card-body)]">Consultant booking is coming soon. In the meantime, our Help &amp; Support desk can point you in the right direction.</p>
      </section>
    </div>
  );
}
