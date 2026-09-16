"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZARA_FLAGSHIP_AGENTS, type FlagshipAgent } from "@/lib/flagship-agents";


function FlagshipIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "mic":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      );
    case "card":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "receipt":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M14 8H8M16 12H8M12 16H8" strokeLinecap="round" />
        </svg>
      );
    case "coins":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.72 11.06A7.002 7.002 0 0 1 13 19" />
        </svg>
      );
    case "files":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z" />
          <path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8" />
          <path d="M15 2v5h5" />
        </svg>
      );
    case "package":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" x2="12" y1="22" y2="12" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "headphones":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
        </svg>
      );
    case "crown":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
        </svg>
      );
    case "scale":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1zM7 21h10M12 3v18M3 7h18" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function FlagshipShowcase() {
  const router = useRouter();
  const [selectedAgent, setSelectedAgent] = useState<FlagshipAgent | null>(null);

  function handleAgentClick(agent: FlagshipAgent) {
    if (agent.id === "flagship.voice_studio") {
      router.push("/voice");
    } else {
      setSelectedAgent(agent);
    }
  }

  return (
    <section className="space-y-6 pt-2">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Flagship Enterprise Agents</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
            Executive, finance, and back-office agents ported from the Zara Partner Console.
            Pre-configured with certified toolsets, continuous compliance evals, and quantified ROI.
          </p>
        </div>

        <Link
          href="/voice"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:brightness-110 active:scale-95 transition"
        >
          <span>⚡ Enter Voice Studio</span>
          <span>→</span>
        </Link>
      </div>

      {/* Flagship Agent Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Flagship specialists · {ZARA_FLAGSHIP_AGENTS.length}
          </h3>
          <span className="text-xs text-slate-400">Click any card to explore or launch</span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ZARA_FLAGSHIP_AGENTS.map((agent) => {
            const isVoiceCard = agent.id === "flagship.voice_studio";
            return (
              <div
                key={agent.id}
                onClick={() => handleAgentClick(agent)}
                className={`group relative flex flex-col justify-between rounded-2xl p-4 sm:p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                  isVoiceCard
                    ? "border-2 border-[#00E5FF] bg-gradient-to-b from-[#0c2238]/95 via-[#091524]/95 to-[#040a12]/95 shadow-[0_0_30px_rgba(0,229,255,0.25)] hover:shadow-[0_0_40px_rgba(0,229,255,0.4)]"
                    : "border border-[rgba(255,255,255,0.08)] bg-gradient-to-b from-[#121926]/90 to-[#0A101A]/95 hover:border-[#00D2FF]/50 hover:shadow-[0_12px_32px_-10px_rgba(0,210,255,0.25)]"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Icon + Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[#00D2FF] group-hover:scale-105 transition-transform ${
                        isVoiceCard
                          ? "bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_15px_rgba(0,229,255,0.4)]"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <FlagshipIcon icon={agent.icon} />
                    </div>

                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {agent.roi}
                    </span>
                  </div>

                  {/* Name & Description */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`text-sm font-bold transition-colors truncate ${
                          isVoiceCard ? "text-cyan-300 group-hover:text-white" : "text-white group-hover:text-[#00D2FF]"
                        }`}
                      >
                        {agent.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {agent.desc}
                    </p>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end text-xs">
                  <span
                    className={`font-semibold group-hover:translate-x-0.5 transition-transform ${
                      isVoiceCard ? "text-cyan-300 font-bold" : "text-[#00D2FF]"
                    }`}
                  >
                    {isVoiceCard ? "Launch Voice Studio →" : "Configure →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flagship Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-[#00D2FF]/30 bg-gradient-to-b from-[#111c2a] to-[#0a111a] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[#00D2FF]">
                  <FlagshipIcon icon={selectedAgent.icon} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
                  <span className="text-xs text-[#00D2FF] font-medium">{selectedAgent.cat} · {selectedAgent.tier.toUpperCase()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedAgent.desc}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Verified Value</span>
                <span className="text-sm font-bold text-emerald-400">{selectedAgent.roi}</span>
              </div>
              <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Continuous Evals</span>
                <span className="text-sm font-bold text-white">{selectedAgent.evals}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Certified Core Capabilities
              </span>
              <ul className="space-y-1">
                {selectedAgent.capabilities.map((cap, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-[#00D2FF]">✓</span>
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              {selectedAgent.familyId ? (
                <Link
                  href={selectedAgent.familyId === "create" ? "/voice" : `/agents/${selectedAgent.familyId}`}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-400 to-[#00D2FF] py-3 text-center text-xs font-extrabold text-slate-950 hover:brightness-110 transition"
                >
                  Configure & Rent Agent &rarr;
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="flex-1 rounded-xl bg-[#00D2FF] py-3 text-center text-xs font-extrabold text-slate-950"
                >
                  Deploy to Workspace
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
