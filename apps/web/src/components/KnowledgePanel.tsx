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
        <div className="rounded-lg border border-[var(--line)] p-3">
          <div className="mb-2 text-xs font-medium">{t("knowledge.addFile")}</div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">{t("knowledge.fileHint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.html,.htm,.pdf,text/*,application/pdf"
            className="block w-full text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--bg-elev)] file:px-3 file:py-1.5 file:text-xs file:text-[var(--text)]"
            disabled={busy === "upload"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
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
