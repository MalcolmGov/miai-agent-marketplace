"use client";

import { useState } from "react";
import Link from "next/link";

export interface RegionFact {
  market: string;
  label: string;
  flag: string;
  packId: string;
  compliance: string[];
  languages: string[];
  channels: string[];
  current: boolean;
}

function cap(list: string[], n: number): string[] {
  return list.slice(0, n);
}

/**
 * The 5-market localization strip for an agent family — shows that the same agent ships
 * as regional packs (compliance regimes, languages, channel mix per market) and links to
 * each regional studio. Renders nothing for legacy families without market packs.
 */
export function RegionStrip({ familyName, regions }: { familyName?: string; regions: RegionFact[] }) {
  const [compare, setCompare] = useState(false);
  if (!regions || regions.length < 2) return null;

  return (
    <div className="panel p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">
            🌍 Localized in {regions.length} markets
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {familyName ? `“${familyName}”` : "This agent"} ships as regional packs — each with its
            own compliance regimes, languages and channel mix. Open any region below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCompare((v) => !v)}
          className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:border-[var(--accent)] transition-colors"
        >
          {compare ? "Hide comparison ▲" : "Compare regions ▼"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <Link
            key={r.market}
            href={`/agents/${r.packId}`}
            className={`flex flex-col gap-1 rounded-xl border px-3 py-2 text-xs transition-colors ${
              r.current
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                : "border-[var(--line)] bg-[var(--bg-elev)] hover:border-[var(--accent)]"
            }`}
            title={r.compliance.length ? `Compliance: ${r.compliance.join(", ").toUpperCase()}` : undefined}
          >
            <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
              <span aria-hidden>{r.flag}</span>
              {r.label}
              {r.current ? (
                <span className="ml-1 rounded-full border border-[var(--accent)] px-1.5 text-[9px] font-bold uppercase text-[var(--accent-bright)]">
                  viewing
                </span>
              ) : null}
            </span>
            <span className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--muted)]">
              {cap(r.compliance, 3).map((c) => (
                <span key={c} className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-400 uppercase">
                  {c.replace(/_/g, " ")}
                </span>
              ))}
              {r.languages.length ? (
                <span className="rounded bg-white/5 px-1.5 py-0.5 font-medium uppercase">
                  {cap(r.languages, 4).join(" · ")}
                  {r.languages.length > 4 ? ` +${r.languages.length - 4}` : ""}
                </span>
              ) : null}
            </span>
          </Link>
        ))}
      </div>

      {compare ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <th className="border-b border-[var(--line)] py-2 pr-3 font-semibold">Region</th>
                <th className="border-b border-[var(--line)] py-2 pr-3 font-semibold">Compliance</th>
                <th className="border-b border-[var(--line)] py-2 pr-3 font-semibold">Languages</th>
                <th className="border-b border-[var(--line)] py-2 font-semibold">Channels</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.market} className={r.current ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]" : ""}>
                  <td className="border-b border-[var(--line)] py-2 pr-3 font-semibold text-[var(--text)]">
                    <span aria-hidden className="mr-1.5">{r.flag}</span>
                    {r.label}
                  </td>
                  <td className="border-b border-[var(--line)] py-2 pr-3 uppercase text-[var(--card-body)]">
                    {r.compliance.length ? r.compliance.join(" · ").replace(/_/g, " ") : "—"}
                  </td>
                  <td className="border-b border-[var(--line)] py-2 pr-3 uppercase text-[var(--card-body)]">
                    {r.languages.length ? r.languages.join(" · ") : "—"}
                  </td>
                  <td className="border-b border-[var(--line)] py-2 text-[var(--card-body)]">
                    {r.channels.length ? r.channels.join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Every pack is a full agent: same family, localized summary, compliance framing,
            language set and channel mix. Rent any region independently.
          </p>
        </div>
      ) : null}
    </div>
  );
}
