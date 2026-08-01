"use client";

import Link from "next/link";
import { useState } from "react";

export default function RequestPage() {
  const [business, setBusiness] = useState("");
  const [need, setNeed] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [channel, setChannel] = useState("WhatsApp");
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
          business,
          need,
          contactName,
          contactEmail,
          channel,
          source: "Dashboard",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setDoneId(data.request.id);
      setBusiness("");
      setNeed("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Request received</h1>
        <p className="text-sm text-[var(--muted)]">
          We logged <code className="text-[var(--accent-bright)]">{doneId}</code> into the operator
          pipeline. Move Digital + MyInstantAI will scope it against the catalogue and your tenancy.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => setDoneId(null)}>
            Submit another
          </button>
          <Link href="/admin" className="btn btn-ghost">
            Open Agent Admin
          </Link>
          <Link href="/" className="btn btn-ghost">
            Back to catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Request a custom agent</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Share the workflow, systems, and customer channel. Requests land in Agent Admin for
          scoping — New → Reviewing → Scoped.
        </p>
      </div>

      <form onSubmit={submit} className="panel space-y-4 p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Business
          </span>
          <input
            className="input"
            required
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="e.g. Kagiso Logistics"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            What they need
          </span>
          <textarea
            className="input min-h-[120px]"
            required
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="Quote deliveries & book drivers from WhatsApp…"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Your name
            </span>
            <input
              className="input"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Email
            </span>
            <input
              className="input"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Primary channel
          </span>
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {["WhatsApp", "Web", "App", "SMS", "Voice"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </div>
  );
}
