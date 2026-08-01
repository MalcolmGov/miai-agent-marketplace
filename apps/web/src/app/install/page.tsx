import Link from "next/link";

export default function InstallPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Go live</h1>
        <p className="mt-2 text-base leading-relaxed text-[var(--muted)]">
          Install takes a few clicks inside an agent. Pick website or mobile app, copy, done.
        </p>
      </div>

      <ol className="panel space-y-5 p-5">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-xs font-semibold text-[var(--accent-bright)]">
            1
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Open an agent</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              From the marketplace, open the agent you want customers to talk to.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-xs font-semibold text-[var(--accent-bright)]">
            2
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Rent it</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              That creates your install key. One click.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-xs font-semibold text-[var(--accent-bright)]">
            3
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Open Install</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Choose <strong className="text-[var(--text)]">Website</strong> or{" "}
              <strong className="text-[var(--text)]">Mobile app</strong>, then copy the code or link.
            </p>
          </div>
        </li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary text-sm">
          Browse agents
        </Link>
        <Link href="/my-agents" className="btn text-sm">
          My agents
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Website uses a small script tag. Mobile app uses a full-screen link in your WebView. Same key,
        same wallet.
      </p>
    </div>
  );
}
