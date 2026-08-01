"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/locale";

export default function CreatePage() {
  const t = useT();
  const [business, setBusiness] = useState("");
  const [need, setNeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          business: business || "New business",
          need,
          source: "Create",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("create.errorSave"));
      setDoneId(data.request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("create.errorSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("create.title")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("create.lede")}</p>
      </div>

      {doneId ? (
        <div className="panel space-y-3 p-5">
          <p className="text-sm">{t("create.loggedAs", { id: doneId })}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="btn btn-primary">
              {t("create.viewAdmin")}
            </Link>
            <Link href="/request" className="btn btn-ghost">
              {t("create.addDetail")}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setDoneId(null)}>
              {t("create.describeAnother")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="panel space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t("create.businessOptional")}
            </span>
            <input
              className="input"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder={t("create.businessPlaceholder")}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t("create.jobDescription")}
            </span>
            <textarea
              className="input min-h-[140px]"
              required
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder={t("create.jobPlaceholder")}
            />
          </label>
          {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? t("create.saving") : t("create.sendPipeline")}
            </button>
            <Link href="/request" className="btn btn-ghost">
              {t("create.fullForm")}
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
