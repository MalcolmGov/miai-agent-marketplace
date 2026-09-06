"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { OnboardingIntent, OnboardingMarket } from "@/lib/workspace-onboarding-types";

const DRAFT_KEY = "miai.onboarding.draft";

function resumeFlag(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("resume") === "1";
}

/** Post-onboarding return path, e.g. an agent the user tried to set up. Internal paths only. */
function nextTarget(): string | null {
  if (typeof window === "undefined") return null;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

const MARKETS: Array<{ id: OnboardingMarket; label: string }> = [
  { id: "us", label: "United States" },
  { id: "eu", label: "Europe" },
  { id: "africa", label: "Africa" },
  { id: "asia", label: "Asia" },
  { id: "oceania", label: "Oceania" },
];

const INTENTS: Array<{ id: OnboardingIntent; label: string; hint: string }> = [
  { id: "customer-support", label: "Customer support", hint: "Tickets, FAQs, refunds" },
  { id: "bookings", label: "Bookings & field service", hint: "Appointments, home services" },
  { id: "hotel", label: "Hotel & guest", hint: "Concierge, reservations" },
  { id: "it-helpdesk", label: "IT helpdesk", hint: "Internal employee support" },
  { id: "sales", label: "Sales qualifier", hint: "Inbound lead triage" },
  { id: "other", label: "Something else", hint: "Browse the full catalogue" },
];

const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

type Step = "welcome" | "business" | "intent" | "account";

function readDraft(): Partial<{
  companyName: string;
  market: OnboardingMarket;
  industry: string;
  companySize: string;
  intent: OnboardingIntent;
  email: string;
}> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ReturnType<typeof readDraft>) : null;
  } catch {
    return null;
  }
}

export function GetStartedWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [companyName, setCompanyName] = useState("");
  const [market, setMarket] = useState<OnboardingMarket>("us");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("1-10");
  const [intent, setIntent] = useState<OnboardingIntent>("customer-support");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{
    mode: string;
    loginUrl: string | null;
    requiresExternalLogin: boolean;
  } | null>(null);
  const resumeAttempted = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const draft = readDraft();
    if (draft) {
      if (draft.companyName) setCompanyName(draft.companyName);
      if (draft.market) setMarket(draft.market);
      if (draft.industry) setIndustry(draft.industry);
      if (draft.companySize) setCompanySize(draft.companySize);
      if (draft.intent) setIntent(draft.intent);
      if (draft.email) setEmail(draft.email);
    }
    if (resumeFlag()) setStep("account");
  }, []);

  useEffect(() => {
    // Already-onboarded workspace sent here to set up an agent → skip the wizard and forward.
    const target = nextTarget();
    if (!target || resumeFlag()) return;
    let cancelled = false;
    void fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d && (d.profile?.wizardCompleted || d.me?.product === "agents")) {
          router.replace(target);
        }
      })
      .catch(() => {
        /* ignore — show the wizard */
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    void fetch("/api/auth/handoff?return_to=" + encodeURIComponent(window.location.origin + "/"))
      .then((r) => r.json())
      .then((d) =>
        setHandoff({
          mode: d.mode,
          loginUrl: d.loginUrl ?? null,
          requiresExternalLogin: Boolean(d.requiresExternalLogin),
        }),
      )
      .catch(() => setHandoff({ mode: "mock", loginUrl: null, requiresExternalLogin: false }));
  }, []);

  function persistDraft() {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ companyName, market, industry, companySize, intent, email }),
      );
    } catch {
      /* ignore */
    }
  }

  async function submitProfile(payload: {
    companyName: string;
    market: OnboardingMarket;
    industry: string;
    companySize: string;
    intent: OnboardingIntent;
    contactEmail?: string;
  }) {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not finish setup");
    try {
      sessionStorage.setItem("miai.product", "agents");
      sessionStorage.setItem("miai.shellMode", "business");
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    router.push(nextTarget() || data.redirect || "/?onboarding=1");
  }

  async function complete() {
    setBusy(true);
    setError(null);
    persistDraft();
    try {
      if (handoff?.requiresExternalLogin && handoff.loginUrl && !resumeFlag()) {
        const returnTo = `${window.location.origin}/get-started?resume=1`;
        const url = new URL(handoff.loginUrl);
        url.searchParams.set("return_to", returnTo);
        url.searchParams.set("product", "agents");
        window.location.href = url.toString();
        return;
      }

      await submitProfile({
        companyName: companyName.trim() || "My business",
        market,
        industry: industry.trim() || "General",
        companySize,
        intent,
        contactEmail: email.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (resumeAttempted.current) return;
    if (!resumeFlag() || !handoff) return;
    if (!handoff.requiresExternalLogin) return;
    const draft = readDraft();
    if (!draft?.companyName) return;
    resumeAttempted.current = true;
    setBusy(true);
    void fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyName: (draft.companyName || "My business").trim(),
        market: draft.market || "us",
        industry: (draft.industry || "General").trim(),
        companySize: draft.companySize || "1-10",
        intent: draft.intent || "customer-support",
        contactEmail: draft.email?.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not finish setup");
        try {
          sessionStorage.setItem("miai.product", "agents");
          sessionStorage.setItem("miai.shellMode", "business");
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        router.push(nextTarget() || data.redirect || "/?onboarding=1");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Setup failed");
        setBusy(false);
      });
  }, [handoff, router]);

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-10"
      data-testid="get-started-wizard"
      data-hydrated={hydrated ? "1" : "0"}
    >
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-bright)]">
          MyInstantAI Agents
        </p>
        <h1 className="display mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Set up your business workspace
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--card-body)]">
          Separate from consumer token signup. Rent pre-built agents, configure knowledge, and go
          live on web or app.
        </p>
      </div>

      {step !== "welcome" && (
        <div className="mb-3 space-y-2" role="region" aria-label="Onboarding progress">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--accent-bright)]">
              {step === "business" && "Step 1 of 3 — Business details"}
              {step === "intent" && "Step 2 of 3 — Primary intent"}
              {step === "account" && "Step 3 of 3 — Workspace account"}
            </span>
            <span className="font-mono text-[var(--muted)]">
              {step === "business" ? "33%" : step === "intent" ? "66%" : "100%"}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--line)]"
            role="progressbar"
            aria-valuenow={step === "business" ? 1 : step === "intent" ? 2 : 3}
            aria-valuemin={1}
            aria-valuemax={3}
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{
                width: step === "business" ? "33%" : step === "intent" ? "66%" : "100%",
              }}
            />
          </div>
        </div>
      )}

      <div className="panel space-y-5 p-5">
        {step === "welcome" ? (
          <>
            <p className="text-sm text-[var(--text)]">
              You&apos;ll create a workspace, pick your market, and land on the agent catalogue with
              a short checklist — not a personal token wallet flow.
            </p>
            <ul className="space-y-2.5 text-sm text-[var(--card-body)]">
              {[
                "Browse 500 agents across 5 markets",
                "Try in sandbox, then rent and embed",
                "Invite teammates from Workspace",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary w-full"
              data-testid="onboarding-start"
              onClick={() => setStep("business")}
            >
              Start business setup
            </button>
            <p className="text-center text-xs text-[var(--muted-dim)]">
              Looking for prepaid AI tokens instead?{" "}
              <a
                href={process.env.NEXT_PUBLIC_MIAI_CONSUMER_APP_URL || "/assistant"}
                className="text-[var(--accent-bright)] hover:underline"
              >
                Consumer Get Started
              </a>
            </p>
          </>
        ) : null}

        {step === "business" ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Company name
              </span>
              <input
                className="input"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Support Co"
                data-testid="onboarding-company"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Primary market
              </span>
              <select
                className="input"
                value={market}
                onChange={(e) => setMarket(e.target.value as OnboardingMarket)}
                data-testid="onboarding-market"
              >
                {MARKETS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Industry
              </span>
              <input
                className="input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Retail, hospitality, healthcare…"
                data-testid="onboarding-industry"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Company size
              </span>
              <select
                className="input"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("welcome")}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={companyName.trim().length < 2}
                onClick={() => setStep("intent")}
              >
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === "intent" ? (
          <>
            <p className="text-sm text-[var(--text)]">What should your first agent help with?</p>
            <div className="grid gap-2.5" data-testid="onboarding-intent">
              {INTENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`select-card px-3.5 py-3 text-left text-sm ${
                    intent === item.id ? "select-card-active" : ""
                  }`}
                  onClick={() => setIntent(item.id)}
                >
                  <span className="font-medium text-[var(--text)]">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--card-meta)]">{item.hint}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("business")}>
                Back
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => setStep("account")}>
                Continue
              </button>
            </div>
          </>
        ) : null}

        {step === "account" ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              {handoff?.requiresExternalLogin
                ? "Next you’ll sign in with MyInstantAI Agents auth (same account stack, business product intent)."
                : "Staging mock mode — confirm your work email. You’ll be the workspace owner."}
            </p>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Work email
              </span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                data-testid="onboarding-email"
              />
            </label>
            {!handoff?.requiresExternalLogin ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Password
                </span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  data-testid="onboarding-password"
                />
              </label>
            ) : null}
            <p className="text-xs text-[var(--muted-dim)]">
              You will be the workspace <strong className="text-[var(--text)]">owner</strong> and can
              invite teammates later from Workspace.
            </p>
            {error ? <p className="text-sm text-[var(--warn,#fb923c)]">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("intent")}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={busy}
                onClick={() => void complete()}
                data-testid="onboarding-finish"
              >
                {busy
                  ? "Working…"
                  : handoff?.requiresExternalLogin
                    ? "Continue to sign in"
                    : "Open agent catalogue"}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--muted-dim)]">
        Already set up?{" "}
        <Link href="/login" className="text-[var(--accent-bright)] hover:underline">
          Sign in
        </Link>
        {" · "}
        <Link href="/" className="text-[var(--accent-bright)] hover:underline">
          Browse catalogue
        </Link>
      </p>
    </div>
  );
}
