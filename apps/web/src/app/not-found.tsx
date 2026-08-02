import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-xl font-semibold text-[var(--text)]">Page not found</h1>
      <p className="text-sm text-[var(--muted)]">That route does not exist in the marketplace.</p>
      <Link href="/" className="btn btn-primary">
        Back to catalogue
      </Link>
    </div>
  );
}
