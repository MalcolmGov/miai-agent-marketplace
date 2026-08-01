import Link from "next/link";
import { ROADMAP_SECURITY, statusLabel, type Status } from "@/lib/trust-content";

const PRODUCT: Array<{ when: string; item: string; status: Status }> = [
  {
    when: "Shipped",
    item: "Multi-market catalogue (US / EU / Africa / Asia), Agent Studio, Live Ops, Insights, Agent Admin",
    status: "shipped",
  },
  {
    when: "Shipped",
    item: "OAuth connectors, website embed, knowledge paste/upload/crawl, wallet metering",
    status: "shipped",
  },
  {
    when: "Next",
    item: "MyInstantAI OIDC + wallet + model gateway cutover on Azure",
    status: "in_progress",
  },
  {
    when: "Shipped",
    item: "Custom agent request pipeline + DSAR export for workspace data",
    status: "shipped",
  },
  {
    when: "Scale",
    item: "Per-tenant data residency pins and multi-region active-active",
    status: "planned",
  },
];

function Chip({ status }: { status: Status }) {
  if (status === "shipped") return <span className="chip chip-live">{statusLabel(status)}</span>;
  if (status === "in_progress")
    return (
      <span className="chip" style={{ color: "#f0b429", borderColor: "rgba(240,180,41,0.45)" }}>
        {statusLabel(status)}
      </span>
    );
  return <span className="chip">{statusLabel(status)}</span>;
}

export default function RoadmapPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Roadmap</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Product and security milestones for the partnership — aligned with the{" "}
          <Link href="/trust" className="text-[var(--accent-bright)] hover:underline">
            Trust Center
          </Link>
          .
        </p>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Product</h2>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {PRODUCT.map((r) => (
            <li
              key={r.item}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {r.when}
                </span>
                <p className="mt-0.5 text-sm">{r.item}</p>
              </div>
              <Chip status={r.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="panel overflow-hidden" style={{ borderTop: "2px solid var(--accent)" }}>
        <div className="border-b border-[var(--line)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Security &amp; compliance
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Same milestones as Trust &amp; Security — so the meeting story stays consistent.
          </p>
        </div>
        <ul className="divide-y divide-[var(--line)]">
          {ROADMAP_SECURITY.map((r) => (
            <li
              key={r.item}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  {r.when}
                </span>
                <p className="mt-0.5 text-sm">{r.item}</p>
              </div>
              <Chip status={r.status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
