"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

/** Client-side shell flags the Sidebar reads to render business (vs consumer) chrome. */
function setBusinessShellFlags(displayName?: string) {
  try {
    sessionStorage.setItem("miai.product", "agents");
    sessionStorage.setItem("miai.shellMode", "business");
    if (displayName) sessionStorage.setItem("miai.mockUser", displayName);
    sessionStorage.setItem("miai.mockSignedIn", "1");
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
}

type Phase = "loading" | "google" | "mock" | "completing" | "denied" | "error";

function Shell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
        MyInstantAI Agents
      </p>
      {children}
    </div>
  );
}

function BusinessLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  // Credentials form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authAction, setAuthAction] = useState<"signin" | "signup">("signin");
  const [credBusy, setCredBusy] = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  const returnTo = safeReturnTo(searchParams.get("return_to"));

  useEffect(() => {
    let cancelled = false;

    // Post-callback landing: the callback set the HttpOnly session cookie and bounced here so we can
    // set the client shell flags (read by the Sidebar) before forwarding to the destination.
    if (searchParams.get("complete") === "1") {
      setPhase("completing");
      (async () => {
        try {
          const res = await fetch("/api/business/auth/me");
          const data = await res.json();
          if (cancelled) return;
          if (data.signedIn) {
            setBusinessShellFlags(data.email || data.name || undefined);
            router.replace(returnTo);
            return;
          }
          setPhase("error");
        } catch {
          if (!cancelled) setPhase("error");
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // Otherwise resolve the sign-in mode (and the first-party login URL) from the handoff.
    const absoluteReturn =
      typeof window !== "undefined"
        ? `${window.location.origin}${returnTo.startsWith("/") ? returnTo : `/${returnTo}`}`
        : returnTo;

    (async () => {
      let data: { mode?: string; loginUrl?: string } = {};
      try {
        const res = await fetch(`/api/auth/handoff?return_to=${encodeURIComponent(absoluteReturn)}`);
        data = await res.json();
      } catch {
        /* leave data empty → error/mock fallback below */
      }
      if (cancelled) return;
      setLoginUrl(typeof data.loginUrl === "string" ? data.loginUrl : null);
      if (searchParams.get("denied") === "1") setPhase("denied");
      else if (searchParams.get("auth_error") === "1") setPhase("error");
      else if (data.mode === "oidc" && data.loginUrl) setPhase("google");
      else setPhase("mock");
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, returnTo, router]);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCredBusy(true);
    setCredError(null);
    try {
      const res = await fetch("/api/business/auth/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          action: authAction,
          returnTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCredError(data.error || "Authentication failed");
        return;
      }
      setBusinessShellFlags(data.email);
      router.replace(data.returnTo || returnTo);
    } catch {
      setCredError("Network error. Please try again.");
    } finally {
      setCredBusy(false);
    }
  }

  if (phase === "loading" || phase === "completing") {
    return (
      <Shell>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {phase === "completing" ? "Signing you in…" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {phase === "completing" ? "Setting up your workspace…" : "Preparing sign-in…"}
        </p>
      </Shell>
    );
  }

  if (phase === "denied") {
    return (
      <Shell>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">You&apos;re not on the invite list</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Access to the Agents workspace is invitation-only right now. Ask your workspace owner to add
          your work email, or sign in with an authorized account.
        </p>
        <div className="panel mt-6 space-y-3 p-5">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => {
              setPhase(loginUrl ? "google" : "mock");
            }}
          >
            Try a different account
          </button>
          <p className="text-center text-xs text-[var(--muted-dim)]">
            Need access? Contact your MyInstantAI workspace administrator.
          </p>
        </div>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign-in didn&apos;t complete</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Something interrupted the sign-in. Please try again.
        </p>
        <div className="panel mt-6 p-5">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => (loginUrl ? window.location.assign(loginUrl) : window.location.reload())}
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your business workspace</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Access is limited to invited teams.</p>
      <div className="panel mt-6 space-y-4 p-5">
        {loginUrl ? (
          <>
            <button
              type="button"
              className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
              data-testid="login-google"
              onClick={() => window.location.assign(loginUrl)}
              disabled={credBusy}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--line)]" />
              </div>
              <span className="relative bg-[var(--bg-panel)] px-3 text-[11px] uppercase tracking-wider text-[var(--muted-dim)]">
                Or continue with work email
              </span>
            </div>
          </>
        ) : null}

        {/* Tab switch: Sign In vs Create Account */}
        <div className="flex rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] p-1 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthAction("signin");
              setCredError(null);
            }}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              authAction === "signin"
                ? "bg-[var(--accent)] text-black font-semibold shadow"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthAction("signup");
              setCredError(null);
            }}
            className={`flex-1 rounded-md py-1.5 font-medium transition ${
              authAction === "signup"
                ? "bg-[var(--accent)] text-black font-semibold shadow"
                : "text-[var(--muted)] hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@myinstantai.com"
              className="input w-full text-xs sm:text-sm"
              disabled={credBusy}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input w-full text-xs sm:text-sm"
              disabled={credBusy}
              autoComplete={authAction === "signup" ? "new-password" : "current-password"}
            />
            {authAction === "signup" && (
              <p className="mt-1 text-[11px] text-[var(--muted-dim)]">Minimum 8 characters</p>
            )}
          </div>

          {credError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
              {credError}
            </div>
          )}

          <button
            type="submit"
            disabled={credBusy}
            className="btn btn-primary w-full !py-2 text-xs font-semibold"
          >
            {credBusy
              ? "Authenticating…"
              : authAction === "signup"
                ? "Create Account & Enter"
                : "Sign In"}
          </button>
        </form>

        {phase === "mock" && !loginUrl && (
          <div className="pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn btn-ghost w-full text-xs text-[var(--muted)] hover:text-white"
              data-testid="login-submit"
              onClick={() => {
                setBusinessShellFlags("demo@company.com");
                router.push(returnTo);
              }}
            >
              Continue as guest (staging click-through)
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--muted-dim)]">
        New to Agents?{" "}
        <Link href="/get-started" className="text-[var(--accent-bright)] hover:underline">
          Set up a business workspace
        </Link>
      </p>
    </Shell>
  );
}

/**
 * Agents login — supports both Google Workspace SSO ("Continue with Google") and
 * direct Work Email + Password sign-in / sign-up.
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
      <BusinessLogin />
    </Suspense>
  );
}
