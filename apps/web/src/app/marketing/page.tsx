import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "myinstantai — marketing preview (Agents entry)",
  description:
    "Railway visualization of the myinstantai.com marketing page with a For business entry into Agents onboarding. Not the live consumer site.",
};

/**
 * Partner demo surface: looks like myinstantai.com marketing so MyInstantAI can
 * see how “For business” would enter Agents — hosted on Railway, not their CMS.
 */
export default function MarketingPreviewPage() {
  return (
    <div
      className="min-h-[100dvh] text-white"
      style={{
        background:
          "radial-gradient(ellipse 90% 55% at 50% -10%, rgba(20,120,110,0.55), transparent 55%), linear-gradient(180deg, #041816 0%, #020808 45%, #010504 100%)",
      }}
    >
      <div className="border-b border-[#1a4a4a] bg-[#0d8f8a] px-4 py-2 text-center text-sm text-white">
        <span className="opacity-95">New here? Claim 15,000 free tokens on signup </span>
        <span className="mx-2 inline-flex items-center rounded-full bg-[#0a1210] px-3 py-0.5 text-xs font-semibold">
          Claim now →
        </span>
        <span className="ml-3 hidden text-xs opacity-90 sm:inline">Android app</span>
      </div>

      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2bb8a8]/40 bg-[#0a2a28]"
            aria-hidden
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#3dd6c6] shadow-[0_0_12px_#3dd6c6]" />
          </span>
          <span className="text-[1.05rem] font-semibold tracking-tight">
            myinstant<span className="text-[#5eead4]">ai</span>
          </span>
        </div>
        <nav className="hidden items-center gap-5 text-sm text-white/70 md:flex" aria-label="Marketing">
          <span>How It Works</span>
          <span>Pricing</span>
          <span>Models</span>
          <span>About Us</span>
          <span>FAQ</span>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-white/60 sm:inline">EN</span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0a1210]">
            Get Started
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-24 pt-16 text-center sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(20,120,110,0.45), transparent 60%), radial-gradient(ellipse 100% 80% at 50% 100%, #020808 0%, #041210 50%, #020605 100%)",
          }}
        />

        <h1 className="text-[clamp(2.4rem,8vw,3.75rem)] font-semibold leading-[1.1] tracking-tight">
          AI Access{" "}
          <span className="inline-block rounded-2xl bg-[#2bb8a8] px-3 py-1 italic text-[#041614]">
            Your Way
          </span>
        </h1>
        <p className="mt-5 max-w-lg text-base text-white/75 sm:text-lg">
          Buy prepaid AI tokens at 75,000+ stores and e-commerce sites worldwide.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <a
            href="https://app.myinstantai.com/auth"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#0a1210]"
            target="_blank"
            rel="noreferrer"
          >
            Get Started
            <span className="rounded-md bg-black/10 px-1.5 py-0.5 text-xs" aria-hidden>
              →
            </span>
          </a>
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3dd6c6]/50 bg-[#0a2a28] px-6 py-3.5 text-sm font-semibold text-[#6aefe0]"
            data-testid="marketing-for-business"
          >
            For business — Agents
            <span aria-hidden>→</span>
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/80">
          <li className="inline-flex items-center gap-1.5">
            <span className="text-[#3dd6c6]">✓</span> No subscription
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="text-[#3dd6c6]">✓</span> No personal data
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="text-[#3dd6c6]">✓</span> Complete privacy
          </li>
        </ul>

        <p className="mt-16 text-xs uppercase tracking-[0.16em] text-white/40">
          Trusted Retail Partners
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/35">
          <span className="rounded-md border border-white/10 px-4 py-2">pAI</span>
          <span className="rounded-md border border-white/10 px-4 py-2">ez</span>
          <span className="rounded-md border border-white/10 px-4 py-2">Bitrefill</span>
        </div>
      </main>
    </div>
  );
}
