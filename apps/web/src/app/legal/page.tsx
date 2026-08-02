import Link from "next/link";
import { LEGAL_DRAFT_BANNER, LEGAL_LAST_UPDATED, LEGAL_VERSION } from "@/lib/legal-content";

export const metadata = {
  title: "Legal — MyInstantAI Agents",
  description: "Privacy, terms, cookies, data protection, and Trust Center for the Agent Marketplace.",
};

const LINKS = [
  {
    href: "/privacy",
    title: "Privacy notice",
    blurb:
      "Full draft notice: data categories, AI processing, subprocessors, transfers, retention, rights, and contact.",
  },
  {
    href: "/terms",
    title: "Terms of use",
    blurb:
      "Service scope, acceptable use, AI disclaimers, IP, confidentiality, fees, liability placeholders, and governing law TBD.",
  },
  {
    href: "/cookies",
    title: "Cookies & local storage",
    blurb: "Essential vs optional storage, consent preference, embed widget, and how to manage choices.",
  },
  {
    href: "/data-protection",
    title: "Data protection",
    blurb:
      "Roles, processing inventory, DSAR/export/erasure, security controls, breach posture, and sector caveats (HIPAA/PCI).",
  },
  {
    href: "/trust",
    title: "Trust Center",
    blurb: "Live security posture, honesty labels for residency/certs, and compliance roadmap.",
  },
] as const;

export default function LegalHubPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[var(--card-meta)]">
        Legal & compliance
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">Legal hub</h1>
      <p className="mt-2 text-sm text-[var(--card-meta)]">
        Version {LEGAL_VERSION} · Last updated {LEGAL_LAST_UPDATED}
      </p>
      <p
        className="mt-4 rounded-lg border border-[rgba(240,180,41,0.35)] bg-[rgba(240,180,41,0.08)] px-3 py-2 text-sm text-[var(--text)]"
        role="note"
      >
        {LEGAL_DRAFT_BANNER}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-[var(--card-body)]">
        Expanded customer-facing draft policies for privacy, terms, cookies, and data protection.
        Items marked TBD (entity, DPO, governing law, liability caps, SCCs) must be completed by
        counsel before customer cutover. Internal packs (RoPA, DPIA, DPA/BAA templates) remain in{" "}
        <code className="text-[var(--accent-bright)]">docs/compliance/</code> and are not signed
        contracts.
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
