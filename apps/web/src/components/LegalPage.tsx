import Link from "next/link";
import { LEGAL_DRAFT_BANNER, type LegalSection } from "@/lib/legal-content";

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Legal
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
      <p
        className="mt-4 rounded-lg border border-[rgba(240,180,41,0.35)] bg-[rgba(240,180,41,0.08)] px-3 py-2 text-sm text-[var(--text)]"
        role="note"
      >
        {LEGAL_DRAFT_BANNER}
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold text-[var(--text)]">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 48)} className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-[var(--card-meta)]">
        See also{" "}
        <Link href="/legal" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
          Legal hub
        </Link>
        ,{" "}
        <Link href="/trust" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
          Trust Center
        </Link>
        ,{" "}
        <Link href="/privacy" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
          Privacy
        </Link>
        ,{" "}
        <Link href="/terms" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
          Terms
        </Link>
        ,{" "}
        <Link href="/cookies" className="text-[var(--accent-bright)] underline-offset-2 hover:underline">
          Cookies
        </Link>
        ,{" "}
        <Link
          href="/data-protection"
          className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
        >
          Data protection
        </Link>
        .
      </p>
    </div>
  );
}
