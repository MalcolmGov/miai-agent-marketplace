import Link from "next/link";

export function ComingSoon({
  title,
  description,
  ctaHref = "/",
  ctaLabel = "Back to marketplace",
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rise mx-auto max-w-xl py-10 text-center sm:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
        MyInstantAI
      </p>
      <h1 className="display mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
        {title}
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">{description}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={ctaHref} className="btn btn-primary">
          {ctaLabel}
        </Link>
        <Link href="/" className="btn btn-ghost">
          Browse agents
        </Link>
      </div>
    </div>
  );
}
