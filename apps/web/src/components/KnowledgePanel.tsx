"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/locale";
import { resolveProblemArea } from "@/lib/knowledge-guidance";

interface SourceRow {
  id: string;
  type: "paste" | "file" | "website";
  title: string;
  url?: string;
  filename?: string;
  status: "ready" | "processing" | "error";
  error?: string;
  chars: number;
  createdAt: string;
  preview?: string;
}

export function KnowledgePanel({
  agentId,
  agentName,
  agentCategory,
  knowledge,
  templateKnowledge,
  onKnowledgeChange,
  saving,
  onSaveDraft,
  onMarkReady,
  configMsg,
  showSelectedTip,
}: {
  agentId: string;
  agentName?: string;
  agentCategory?: string;
  knowledge: string;
  /** The package's shipped example knowledge — enables the "template" banner when untouched. */
  templateKnowledge?: string;
  onKnowledgeChange: (v: string) => void;
  saving: boolean;
  onSaveDraft: () => void;
  onMarkReady: () => void;
  configMsg: { kind: "ok" | "err"; text: string } | null;
  showSelectedTip: boolean;
}) {
  const t = useT();
  const problemArea = useMemo(
    () => resolveProblemArea(agentCategory || "", agentId || "", agentName || ""),
    [agentCategory, agentId, agentName],
  );
  const [showGuide, setShowGuide] = useState(true);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [composedChars, setComposedChars] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Distinguish the three real states of this field so tenants never go live on the example
  // by accident: untouched template · deliberately cleared (empty) · their own knowledge.
  const template = (templateKnowledge ?? "").trim();
  const isTemplate = template.length > 0 && knowledge.trim() === template;
  const isEmpty = knowledge.trim().length === 0;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/knowledge?agentId=${encodeURIComponent(agentId)}`);
    if (!res.ok) return;
    const data = await res.json();
    setSources(data.sources ?? []);
    setComposedChars(data.composedChars ?? 0);
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function uploadFile(file: File) {
    setBusy("upload");
    setMsg(null);
    try {
      const form = new FormData();
      form.set("agentId", agentId);
      form.set("file", file);
      const res = await fetch("/api/knowledge/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? t("knowledge.errorUpload") });
        return;
      }
      setMsg({
        kind: "ok",
        text: t("knowledge.okUpload", {
          filename: file.name,
          chars: Number(data.source?.chars ?? 0).toLocaleString(),
        }),
      });
      await refresh();
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function crawlWebsite() {
    if (!websiteUrl.trim()) return;
    setBusy("crawl");
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, url: websiteUrl.trim(), maxPages: 5 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? t("knowledge.errorCrawl") });
        await refresh();
        return;
      }
      setMsg({
        kind: "ok",
        text: t("knowledge.okCrawl", {
          pages: data.source.pages,
          title: data.source.title || websiteUrl,
          chars: Number(data.source.chars).toLocaleString(),
        }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function removeSource(id: string) {
    setBusy(`del-${id}`);
    try {
      await fetch(`/api/knowledge/${id}?agentId=${encodeURIComponent(agentId)}`, {
        method: "DELETE",
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel space-y-4 p-4">
      {/* 150 Business Problems & Optimal Setup Blueprint Header */}
      <div className="rounded-xl border border-white/[0.09] bg-gradient-to-br from-white/[0.04] to-black/30 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-sm">
              {problemArea.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">{problemArea.title}</span>
                <span className="rounded-full bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.2 text-[10px] font-semibold text-cyan-300">
                  Optimal Setup Guide
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target business problems solved by this agent and setup requirements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {showGuide ? "Hide Guide ▲" : "Show Guide ▼"}
          </button>
        </div>

        {showGuide ? (
          <div className="mt-3.5 pt-3 border-t border-white/[0.07] grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <h4 className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Business Problems Solved
              </h4>
              <ul className="mt-1.5 space-y-1 text-slate-300/90 text-[11.5px] leading-relaxed">
                {problemArea.problems.map((prob, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400/70 shrink-0">•</span>
                    <span>{prob}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-cyan-400">⚙</span> Required for Optimal Setup
              </h4>
              <div className="mt-1.5 space-y-1.5 text-slate-300/90 text-[11.5px]">
                <div className="rounded-lg bg-black/20 p-2 border border-white/[0.05]">
                  <span className="text-slate-400 text-[10.5px] uppercase tracking-wider block font-semibold">Recommended Knowledge Inputs:</span>
                  <ul className="mt-1 space-y-0.5 list-disc pl-4 text-[11px]">
                    {problemArea.optimalSetup.recommendedInputs.map((inp, idx) => (
                      <li key={idx}>{inp}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-medium">Recommended Connectors:</span>
                  <div className="flex flex-wrap gap-1">
                    {problemArea.optimalSetup.recommendedConnectors.map((c) => (
                      <span key={c} className="rounded bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.2 text-[10px] font-semibold text-slate-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{t("knowledge.title")}</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {t("knowledge.lede")}
            {composedChars > 0 && (
              <> {t("knowledge.composed", { count: composedChars.toLocaleString() })}</>
            )}
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Markdown supported
        </span>
      </div>

      {isTemplate ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-relaxed text-amber-200">
            <span className="font-bold">⚠ Example template — not your business.</span>{" "}
            This field is pre-filled so you can try the agent instantly. Replace it with your own
            business information (or upload sources below) before going live — visitors will
            otherwise see example content.
          </div>
          <button
            type="button"
            onClick={() => onKnowledgeChange("")}
            className="shrink-0 self-start rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/25 transition-colors sm:self-center"
          >
            Clear template
          </button>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)] px-4 py-3 text-xs leading-relaxed text-[var(--muted)]">
          <span className="font-bold text-[var(--text)]">No knowledge yet.</span> Your agent
          can&apos;t answer business questions until you add knowledge — paste it above, upload a
          file, or add a website source below. (Sandbox demos still work: they fall back to the
          example template.)
        </div>
      ) : null}

      <div className="relative">
        <textarea
          className="input min-h-[300px] w-full font-mono text-xs leading-relaxed bg-[#0a0f1d]/90 border border-white/[0.12] rounded-2xl p-4 text-slate-200 focus:border-cyan-400/50 shadow-inner"
          value={knowledge}
          onChange={(e) => onKnowledgeChange(e.target.value)}
          placeholder={t("knowledge.placeholder")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-lg border p-3 transition-colors ${
            isDragging
              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
              : "border-[var(--line)]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void uploadFile(f);
          }}
        >
          <div className="mb-2 text-xs font-medium">{t("knowledge.addFile")}</div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">{t("knowledge.fileHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.pdf,text/*,application/pdf"
            className="hidden"
            disabled={busy === "upload"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy === "upload"}
              className="btn btn-primary inline-flex w-full items-center justify-center gap-2 text-xs py-2 cursor-pointer shadow-[0_0_14px_color-mix(in_srgb,var(--accent)_25%,transparent)] transition-all hover:scale-[1.005] active:scale-[0.995] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy === "upload" ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Uploading file…</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Upload File</span>
                </>
              )}
            </button>
            <div className="text-center text-[10px] text-[var(--muted)]">
              {isDragging ? "Drop file to upload" : "Click button or drag and drop file here"}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--line)] p-3">
          <div className="mb-2 text-xs font-medium">{t("knowledge.readWebsite")}</div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">{t("knowledge.crawlHint")}</p>
          <div className="flex flex-col gap-2">
            <input
              className="input text-xs"
              placeholder={t("knowledge.urlPlaceholder")}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void crawlWebsite();
              }}
            />
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy === "crawl" || !websiteUrl.trim()}
              onClick={() => void crawlWebsite()}
            >
              {busy === "crawl" ? t("knowledge.readingSite") : t("knowledge.crawlWebsite")}
            </button>
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium">{t("knowledge.ingestedSources")}</div>
          <ul className="space-y-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip">{s.type}</span>
                    {s.status !== "ready" && (
                      <span className={`chip ${s.status === "error" ? "" : "chip-live"}`}>
                        {s.status === "processing"
                          ? t("knowledge.statusProcessing")
                          : s.status === "error"
                            ? t("knowledge.statusError")
                            : s.status}
                      </span>
                    )}
                    <span className="truncate font-medium">{s.title}</span>
                  </div>
                  <div className="mt-1 text-[var(--muted)]">
                    {s.chars.toLocaleString()} {t("knowledge.chars")}
                    {s.url ? (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          {s.url}
                        </a>
                      </>
                    ) : null}
                    {s.error ? <> · {s.error}</> : null}
                  </div>
                  {s.preview && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-[var(--muted)]">{s.preview}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-1 text-[11px]"
                  disabled={busy === `del-${s.id}`}
                  onClick={() => void removeSource(s.id)}
                >
                  {t("knowledge.remove")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(msg || configMsg) && (
        <p
          className={`text-xs ${
            (msg ?? configMsg)!.kind === "ok" ? "text-[var(--accent)]" : "text-[var(--danger)]"
          }`}
        >
          {(msg ?? configMsg)!.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={saving}
          onClick={onSaveDraft}
        >
          {t("knowledge.saveDraft")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={onMarkReady}
        >
          {saving ? t("knowledge.saving") : t("knowledge.saveContinue")}
        </button>
      </div>
      {showSelectedTip && (
        <p className="text-xs text-[var(--muted)]">{t("knowledge.selectedTip")}</p>
      )}
    </div>
  );
}
