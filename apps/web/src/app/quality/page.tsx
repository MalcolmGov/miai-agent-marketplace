import Link from "next/link";
import { loadEvalLiveScoreboard } from "@/lib/eval-live-scoreboard";

export const metadata = {
  title: "Live quality scoreboard — MyInstantAI Agents",
  description:
    "Hero-set live-LLM pass rates and Wave 4 connector proofs. Not MockModel catalogue scores; not full-catalogue coverage.",
};

export const dynamic = "force-dynamic";

function RatePill({ passed, total, rate }: { passed: number; total: number; rate: number }) {
  const tone =
    rate >= 90 ? "var(--accent-bright)" : rate >= 70 ? "#f0b429" : "var(--danger, #f87171)";
  return (
    <span
      className="chip inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold"
      style={{ color: tone, borderColor: `${tone}66` }}
    >
      {passed}/{total} · {rate}%
    </span>
  );
}

export default async function QualityPage() {
  const board = await loadEvalLiveScoreboard();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs text-[var(--muted)]">Diligence · production evidence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Live quality scoreboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Real-model samples for hero / flagship sets, plus recorded Wave 4 connector proofs. This is
          the surface partners should read — not the MockModel catalogue gate.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--muted)]">
          <span className="chip chip-live px-2 py-1">Live-LLM adapter</span>
          <span className="chip px-2 py-1">Not a CI gate</span>
          <span className="chip px-2 py-1">Hero sets only</span>
          <Link href="/trust" className="chip px-2 py-1 text-[var(--accent-bright)] hover:underline">
            Trust Center →
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--line-strong)] bg-[var(--bg-panel)]/60 p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--card-meta)]">
          Honest labeling
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--card-body)]">
          {board?.disclaimer ??
            "Live-LLM samples only. MockModel catalogue eval pass-rates are a different metric."}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
          {board?.coverageNote ??
            "Depth: live still requires OAuth connector evidence, not merely a live FAQ pass."}
        </p>
      </section>

      {!board ? (
        <p className="text-sm text-[var(--muted)]">
          Scoreboard not generated yet. Run{" "}
          <code className="text-[var(--accent-bright)]">pnpm scoreboard:live</code> (or{" "}
          <code className="text-[var(--accent-bright)]">pnpm eval:live --set=…</code>).
        </p>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight">Hero / flagship live-LLM sets</h2>
              <p className="text-[11px] text-[var(--muted)]">
                Updated {new Date(board.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {board.sets.map((set) => (
                <article
                  key={set.id}
                  className="rounded-xl border border-[var(--line-strong)] bg-[var(--bg-panel)] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{set.label}</h3>
                      <p className="mt-1 text-[11px] text-[var(--muted)]">
                        {set.date} · model <code>{set.modelMode}</code> ·{" "}
                        <code className="text-[10px]">{set.reportFile}</code>
                      </p>
                    </div>
                    <RatePill passed={set.passed} total={set.total} rate={set.rate} />
                  </div>
                  <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
                    {set.results.map((r) => (
                      <li
                        key={`${set.id}-${r.agentId}-${r.prompt.slice(0, 24)}`}
                        className="flex gap-2 border-t border-[var(--line)] pt-2 first:border-0 first:pt-0"
                      >
                        <span aria-hidden className="shrink-0">
                          {r.ok ? "✅" : "❌"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text)]">
                            <code className="text-xs">{r.agentId}</code>
                          </p>
                          <p className="truncate text-[11px] text-[var(--muted)]">{r.prompt}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">Wave 4 connector proofs</h2>
            <p className="max-w-3xl text-sm text-[var(--muted)]">
              First-slice agents with recorded live tool results (
              {board.connectorProofs.agentsProven}/{board.connectorProofs.sliceTarget}). Staging may
              show OAuth <em>configured</em> but not <em>connected</em> until Actions → Connect is
              re-run — that step is required before promoting more pilots to{" "}
              <code>Depth: live</code>.
            </p>
            <div className="flex flex-wrap gap-2">
              {board.connectorProofs.connectors.map((c) => (
                <span key={c} className="chip chip-live px-2 py-1 text-xs">
                  {c}
                </span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--line-strong)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-panel)] text-[11px] uppercase tracking-[0.08em] text-[var(--card-meta)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Agent</th>
                    <th className="px-3 py-2 font-medium">Connector</th>
                    <th className="px-3 py-2 font-medium">Correlation</th>
                    <th className="px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {board.connectorProofs.proofs.slice(0, 24).map((p) => (
                    <tr key={`${p.agentId}-${p.connector}-${p.correlationId}`} className="border-t border-[var(--line)]">
                      <td className="px-3 py-2">
                        <code className="text-xs">{p.agentId}</code>
                      </td>
                      <td className="px-3 py-2 text-[var(--muted)]">{p.connector}</td>
                      <td className="px-3 py-2">
                        <code className="text-[10px] text-[var(--accent-bright)]">{p.correlationId}</code>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-[var(--muted)]">
                        {new Date(p.at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-dashed border-[var(--line-strong)] p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Ops — next live Depth promotion</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--card-body)]">
              <li>
                Staging Actions → Connect Google Calendar + Slack (OAuth apps are already configured).
              </li>
              <li>
                <code>DEMO_BASE=https://miaiweb-production.up.railway.app pnpm proof:live --chat --expand --auto-record</code>
              </li>
              <li>
                Prefer <code>us-events-venue</code> as the flagship demo path; record corr ids on the
                pilot Evidence line before flipping <code>Depth: live</code>.
              </li>
            </ol>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              MyInstantAI OIDC / wallet / gateway remain external — mock rails on staging are expected
              until that wire-up.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
