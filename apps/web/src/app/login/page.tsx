"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

function safeReturnTo(raw: string | null): string {
  if (!raw) return "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (typeof window !== "undefined" && url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}` || "/";
    }
  } catch {
    /* ignore */
  }
  return "/";
}

function MockLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const returnTo = safeReturnTo(searchParams.get("return_to"));
    const absoluteReturn =
      typeof window !== "undefined"
        ? `${window.location.origin}${returnTo.startsWith("/") ? returnTo : `/${returnTo}`}`
        : returnTo;

    (async () => {
      try {
        const res = await fetch(
          `/api/auth/handoff?return_to=${encodeURIComponent(absoluteReturn)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.requiresExternalLogin && data.loginUrl) {
          window.location.href = data.loginUrl as string;
          return;
        }
      } catch {
        if (!cancelled) setError("Could not load auth handoff.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Demo mock: any username + password succeeds (including empty for partner click-through).
    setBusy(true);
    try {
      const name = username.trim() || "demo@company.com";
      sessionStorage.setItem("miai.product", "agents");
      sessionStorage.setItem("miai.shellMode", "business");
      sessionStorage.setItem("miai.mockUser", name);
      sessionStorage.setItem("miai.mockSignedIn", "1");
      const dest = safeReturnTo(searchParams.get("return_to"));
      router.push(dest);
    } catch {
      setError("Could not start demo session.");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
        <p className="text-sm text-[var(--muted)]">Preparing sign-in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
        MyInstantAI Agents
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Access your business workspace. Staging accepts any username and password.
      </p>

      <form
        className="panel mt-6 space-y-4 p-5"
        onSubmit={onSubmit}
        data-testid="mock-login-form"
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Username or email
          </span>
          <input
            className="input"
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@company.com"
            data-testid="login-username"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Password
          </span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            data-testid="login-password"
          />
        </label>
        {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={busy}
          data-testid="login-submit"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--muted-dim)]">
        New to Agents?{" "}
        <Link href="/get-started" className="text-[var(--accent-bright)] hover:underline">
          Set up a business workspace
        </Link>
      </p>
    </div>
  );
}

/**
 * Agents login — OIDC when configured; otherwise mock form (any credentials).
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
          <p className="text-sm text-[var(--muted)]">Preparing sign-in…</p>
        </div>
      }
    >
      <MockLoginForm />
    </Suspense>
  );
}
