"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/locale";

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
  knowledge,
  onKnowledgeChange,
  saving,
  onSaveDraft,
  onMarkReady,
  configMsg,
  showSelectedTip,
}: {
  agentId: string;
  knowledge: string;
  onKnowledgeChange: (v: string) => void;
  saving: boolean;
  onSaveDraft: () => void;
  onMarkReady: () => void;
  configMsg: { kind: "ok" | "err"; text: string } | null;
  showSelectedTip: boolean;
}) {
  const t = useT();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [composedChars, setComposedChars] = useState(0);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pasteExtra, setPasteExtra] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function addPaste() {
    const content = pasteExtra.trim();
    if (!content) return;
    setBusy("paste");
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge/paste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, title: "Extra FAQs", content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error ?? t("knowledge.errorPaste") });
        return;
      }
      setPasteExtra("");
      setMsg({
        kind: "ok",
        text: t("knowledge.okPaste", { chars: data.source.chars.toLocaleString() }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

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
      <div>
        <h2 className="mb-1 text-sm font-semibold">{t("knowledge.title")}</h2>
        <p className="text-xs text-[var(--muted)]">
          {t("knowledge.lede")}
          {composedChars > 0 && (
            <> {t("knowledge.composed", { count: composedChars.toLocaleString() })}</>
          )}
        </p>
      </div>

      <textarea
        className="input min-h-[140px] font-mono text-xs"
        value={knowledge}
        onChange={(e) => onKnowledgeChange(e.target.value)}
        placeholder={t("knowledge.placeholder")}
      />

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

      <div className="rounded-lg border border-[var(--line)] p-3">
        <div className="mb-2 text-xs font-medium">{t("knowledge.addFaqs")}</div>
        <textarea
          className="input min-h-[80px] font-mono text-xs"
          placeholder={t("knowledge.pastePlaceholder")}
          value={pasteExtra}
          onChange={(e) => setPasteExtra(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost mt-2 text-xs"
          disabled={busy === "paste" || pasteExtra.trim().length < 10}
          onClick={() => void addPaste()}
        >
          {busy === "paste" ? t("knowledge.adding") : t("knowledge.addSource")}
        </button>
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
