"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
        setMsg({ kind: "err", text: data.error ?? "Paste failed" });
        return;
      }
      setPasteExtra("");
      setMsg({ kind: "ok", text: `Added paste source (${data.source.chars.toLocaleString()} chars)` });
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
        setMsg({ kind: "err", text: data.error ?? "Upload failed" });
        return;
      }
      setMsg({
        kind: "ok",
        text: `Ingested ${file.name} (${Number(data.source?.chars ?? 0).toLocaleString()} chars)`,
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
        setMsg({ kind: "err", text: data.error ?? "Crawl failed" });
        await refresh();
        return;
      }
      setMsg({
        kind: "ok",
        text: `Read ${data.source.pages} page(s) from ${data.source.title || websiteUrl} (${Number(data.source.chars).toLocaleString()} chars)`,
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
        <h2 className="mb-1 text-sm font-semibold">Knowledge</h2>
        <p className="text-xs text-[var(--muted)]">
          Paste FAQs, upload files, or crawl your website. Sources are merged into the agent prompt
          for sandbox and live chat.
          {composedChars > 0 && (
            <>
              {" "}
              · composed ~{composedChars.toLocaleString()} chars
            </>
          )}
        </p>
      </div>

      <textarea
        className="input min-h-[140px] font-mono text-xs"
        value={knowledge}
        onChange={(e) => onKnowledgeChange(e.target.value)}
        placeholder="Core business knowledge — hours, products, policies…"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] p-3">
          <div className="mb-2 text-xs font-medium">Add file</div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            .txt, .md, .csv, .json, .html (PDF best-effort, 4MB max)
          </p>
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
          <div className="mb-2 text-xs font-medium">Read my website</div>
          <p className="mb-2 text-[11px] text-[var(--muted)]">
            Crawls up to 5 same-site pages (about, FAQ, pricing…)
          </p>
          <div className="flex flex-col gap-2">
            <input
              className="input text-xs"
              placeholder="https://gaslite.co.za"
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
              {busy === "crawl" ? "Reading site…" : "Crawl website"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--line)] p-3">
        <div className="mb-2 text-xs font-medium">Add pasted FAQs</div>
        <textarea
          className="input min-h-[80px] font-mono text-xs"
          placeholder="Extra Q&As to append as a separate source…"
          value={pasteExtra}
          onChange={(e) => setPasteExtra(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost mt-2 text-xs"
          disabled={busy === "paste" || pasteExtra.trim().length < 10}
          onClick={() => void addPaste()}
        >
          {busy === "paste" ? "Adding…" : "Add as knowledge source"}
        </button>
      </div>

      {sources.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium">Ingested sources</div>
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
                        {s.status}
                      </span>
                    )}
                    <span className="truncate font-medium">{s.title}</span>
                  </div>
                  <div className="mt-1 text-[var(--muted)]">
                    {s.chars.toLocaleString()} chars
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
                  Remove
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
          Save draft
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={onMarkReady}
        >
          {saving ? "Saving…" : "Mark rented → ready"}
        </button>
      </div>
      {showSelectedTip && (
        <p className="text-xs text-[var(--muted)]">
          Tip: <strong className="text-[var(--text)]">Mark rented → ready</strong> creates the
          rental and saves this knowledge in one step.
        </p>
      )}
    </div>
  );
}
