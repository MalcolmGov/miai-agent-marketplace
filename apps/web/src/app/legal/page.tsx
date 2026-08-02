import Link from "next/link";
import { LEGAL_DRAFT_BANNER } from "@/lib/legal-content";

export const metadata = {
  title: "Legal — MyInstantAI Agents",
  description: "Privacy, terms, cookies, data protection, and Trust Center for the Agent Marketplace.",
};

const LINKS = [
  {
    href: "/privacy",
    title: "Privacy notice",
    blurb: "What we process, purposes, rights, and retention (draft).",
  },
  {
    href: "/terms",
    title: "Terms of use",
    blurb: "Acceptable use, AI outputs, and draft liability placeholders.",
  },
  {
    href: "/cookies",
    title: "Cookies & local storage",
    blurb: "Essential storage, consent preference, optional analytics.",
  },
  {
    href: "/data-protection",
    title: "Data protection",
    blurb: "DSAR/export/erasure summary and security controls overview.",
  },
  {
    href: "/trust",
    title: "Trust Center",
    blurb: "Security posture, region honesty labels, and compliance roadmap.",
  },
] as const;

export default function LegalHubPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--card-meta)]">
        Legal & compliance
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Legal hub</h1>
      <p
        className="mt-4 rounded-lg border border-[rgba(240,180,41,0.35)] bg-[rgba(240,180,41,0.08)] px-3 py-2 text-sm text-[var(--text)]"
        role="note"
      >
        {LEGAL_DRAFT_BANNER}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[var(--card-body)]">
        Customer-facing notices for the marketplace. Internal counsel packs (ROPA, DPIA, DPA/BAA
        templates) are in the repo under <code className="text-[var(--accent-bright)]">docs/compliance/</code>{" "}
        and are not signed contracts.
      </p>
      <ul className="mt-8 space-y-3">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-xl border border-[var(--line)] bg-[var(--bg-panel)] px-4 py-3 transition hover:border-[var(--accent-dim)]"
            >
              <span className="block text-base font-semibold text-[var(--text)]">{item.title}</span>
              <span className="mt-1 block text-sm text-[var(--card-meta)]">{item.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
