"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/lib/locale";

const CHANNEL_KEYS = [
  ["WhatsApp", "request.channelWhatsApp"],
  ["Web", "request.channelWeb"],
  ["App", "request.channelApp"],
  ["SMS", "request.channelSms"],
  ["Voice", "request.channelVoice"],
] as const;

export default function RequestPage() {
  const t = useT();
  const [business, setBusiness] = useState("");
  const [need, setNeed] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [channel, setChannel] = useState("WhatsApp");
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const channels = useMemo(
    () => CHANNEL_KEYS.map(([value, key]) => ({ value, label: t(key) })),
    [t],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/custom-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          business,
          need,
          contactName,
          contactEmail,
          channel,
          source: "Dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("request.errorFailed"));
      setDoneId(data.request.id);
      setBusiness("");
      setNeed("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("request.errorFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t("request.receivedTitle")}</h1>
        <p className="text-sm text-[var(--muted)]">{t("request.receivedBody", { id: doneId })}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setDoneId(null)}>
            {t("request.submitAnother")}
          </button>
          <Link href="/admin" className="btn btn-ghost">
            {t("request.openAdmin")}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t("request.backCatalogue")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("request.title")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("request.lede")}</p>
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("request.business")}
          </span>
          <input
            className="input"
            required
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder={t("request.businessPlaceholder")}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("request.need")}
          </span>
          <textarea
            className="input min-h-[120px]"
            required
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder={t("request.needPlaceholder")}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t("request.yourName")}
            </span>
            <input
              className="input"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder={t("request.optional")}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t("request.email")}
            </span>
            <input
              className="input"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder={t("request.optional")}
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("request.primaryChannel")}
          </span>
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {channels.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? t("request.submitting") : t("request.submit")}
        </button>
      </form>
    </div>
  );
}
