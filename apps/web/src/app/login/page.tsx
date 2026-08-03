"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Agents login entry — redirects to MIAI Agents auth when configured;
 * otherwise sends users to the business get-started wizard.
 */
export default function LoginPage() {
  const [message, setMessage] = useState("Preparing sign-in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const returnTo = `${window.location.origin}/`;
        const res = await fetch(
          `/api/auth/handoff?return_to=${encodeURIComponent(returnTo)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.requiresExternalLogin && data.loginUrl) {
          window.location.href = data.loginUrl as string;
          return;
        }
        setMessage("Mock auth — continue to business setup or catalogue.");
      } catch {
        if (!cancelled) setMessage("Could not load auth handoff.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Agents</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/get-started" className="btn btn-primary">
          Business setup
        </Link>
        <Link href="/" className="btn btn-ghost">
          Catalogue
        </Link>
      </div>
      <p className="mt-6 text-xs text-[var(--muted-dim)]">
        Consumer token accounts use{" "}
        <a
          href={process.env.NEXT_PUBLIC_MIAI_CONSUMER_APP_URL || "https://app.myinstantai.com/auth"}
          className="text-[var(--accent-bright)] hover:underline"
        >
          MyInstantAI consumer login
        </a>
        .
      </p>
    </div>
  );
}
