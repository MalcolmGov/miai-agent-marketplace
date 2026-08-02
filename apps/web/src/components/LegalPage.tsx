import Link from "next/link";
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_LAST_UPDATED,
  LEGAL_VERSION,
  type LegalSection,
} from "@/lib/legal-content";

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--card-meta)]">
        Legal · {LEGAL_VERSION}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--card-meta)]">Last updated: {LEGAL_LAST_UPDATED}</p>
      <p
        className="mt-4 rounded-lg border border-[rgba(240,180,41,0.35)] bg-[rgba(240,180,41,0.08)] px-3 py-2 text-sm text-[var(--text)]"
        role="note"
      >
        {LEGAL_DRAFT_BANNER}
      </p>

      <nav
        className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] px-4 py-3"
        aria-label="On this page"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--card-meta)]">
          On this page
        </p>
        <ol className="mt-2 columns-1 gap-x-8 text-sm text-[var(--card-body)] sm:columns-2">
          {sections.map((s) => (
            <li key={s.heading} className="break-inside-avoid py-0.5">
              <a
                href={`#${slugify(s.heading)}`}
                className="text-[var(--accent-bright)] underline-offset-2 hover:underline"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.heading} id={slugify(s.heading)}>
            <h2 className="text-lg font-semibold text-[var(--text)]">{s.heading}</h2>
            {s.body.map((p) => (
              <p
                key={p.slice(0, 64)}
                className="mt-3 text-sm leading-relaxed text-[var(--card-body)]"
              >
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-[var(--line)] pt-6 text-sm text-[var(--card-meta)]">
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

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
