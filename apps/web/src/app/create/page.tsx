"use client";

import Link from "next/link";
import { useState } from "react";

export default function CreatePage() {
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
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setDoneId(data.request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Build an agent instantly</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Describe the job in plain language. We&apos;ll log it into the custom-agent pipeline so the
          team can scaffold from catalogue patterns — channels, tools, and guardrails included.
        </p>
      </div>

      {doneId ? (
        <div className="panel space-y-3 p-5">
          <p className="text-sm">
            Logged as <code className="text-[var(--accent-bright)]">{doneId}</code>. Operators will
            see it under Custom agent requests.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="btn btn-primary">
              View in Agent Admin
            </Link>
            <Link href="/request" className="btn btn-ghost">
              Add more detail
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setDoneId(null)}>
              Describe another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="panel space-y-4 p-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Business (optional)
            </span>
            <input
              className="input"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="Your company name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Job description
            </span>
            <textarea
              className="input min-h-[140px]"
              required
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              placeholder="e.g. Qualify inbound WhatsApp leads for our clinic, book appointments, and hand complex cases to a nurse…"
            />
          </label>
          {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Send to pipeline"}
            </button>
            <Link href="/request" className="btn btn-ghost">
              Full request form
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
