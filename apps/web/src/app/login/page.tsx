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

function Shell({ children }: { children: React.ReactNode }) {
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
          your work email, or sign in with a different account.
        </p>
        <div className="panel mt-6 space-y-3 p-5">
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => loginUrl && window.location.assign(loginUrl)}
            disabled={!loginUrl}
          >
            Try a different Google account
          </button>
          <p className="text-center text-xs text-[var(--muted-dim)]">
            Need access? Contact your MyInstantAI workspace owner.
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

  if (phase === "mock") {
    // Local/staging without OIDC configured — no fake password field, just a click-through.
    return (
      <Shell>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This is a staging workspace. Continue to explore the console.
        </p>
        <div className="panel mt-6 p-5">
          <button
            type="button"
            className="btn btn-primary w-full"
            data-testid="login-submit"
            onClick={() => {
              setBusinessShellFlags("demo@company.com");
              router.push(returnTo);
            }}
          >
            Continue to workspace (staging)
          </button>
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

  // phase === "google"
  return (
    <Shell>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your business workspace</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Access is limited to invited teams.</p>
      <div className="panel mt-6 space-y-3 p-5">
        <button
          type="button"
          className="btn btn-primary w-full"
          data-testid="login-google"
          onClick={() => loginUrl && window.location.assign(loginUrl)}
          disabled={!loginUrl}
        >
          Continue with Google
        </button>
        <p className="text-center text-xs text-[var(--muted-dim)]">
          We use your Google account to sign you in.
        </p>
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
 * Agents login — first-party "Continue with Google" when business OIDC is configured (with an
 * invite allowlist enforced at the callback); a click-through staging fallback otherwise.
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
