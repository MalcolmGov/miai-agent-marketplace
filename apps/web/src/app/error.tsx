"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-6 py-16">
      <h1 className="text-xl font-semibold text-[var(--text)]">Something went wrong</h1>
      <p className="text-sm text-[var(--muted)]">
        {error.message || "An unexpected error occurred."}
        {error.digest ? ` (ref ${error.digest})` : ""}
      </p>
      <button type="button" className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
