"use client";

import { useEffect, useState, type ReactNode } from "react";

type MeState = { mode: string; signedIn: boolean; signInEnabled: boolean };

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * Wrap the consumer chat surfaces. In mock mode (or once a valid session is confirmed) it renders
 * its children; in oidc mode with no session it renders a "Sign in with Google" card INSTEAD — so
 * the wrapped component never mounts and its authenticated fetches never fire while signed out.
 */
export function ConsumerAuthGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/consumer/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMe(d as MeState);
      })
      .catch(() => {
        // If we can't tell, fail open to mock-style behaviour rather than locking a person out.
        if (!cancelled) setMe({ mode: "mock", signedIn: true, signInEnabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!me) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (me.mode === "oidc" && !me.signedIn) {
    const returnTo =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/me";
    return (
      <section className="panel mx-auto mt-6 flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <h2 className="display text-xl font-semibold tracking-tight text-[var(--text)]">
          Sign in to continue
        </h2>
        <p className="text-sm leading-relaxed text-[var(--card-body)]">
          Sign in so your assistant remembers you — your preferences, your goals, and the people in
          your life — across every conversation. Your memory stays private to you.
        </p>
        <a
          href={`/api/consumer/auth/login?return_to=${encodeURIComponent(returnTo)}`}
          className="btn btn-primary inline-flex items-center gap-2"
          data-testid="consumer-signin"
        >
          <GoogleMark /> Sign in with Google
        </a>
      </section>
    );
  }

  return <>{children}</>;
}
