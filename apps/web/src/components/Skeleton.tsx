import type { HTMLAttributes } from "react";

function getLineWidth(index: number, total: number): string {
  if (index === total - 1) return "w-3/5";
  if (index % 2 === 0) return "w-full";
  return "w-4/5";
}

export function Skeleton({
  className = "",
  ...props
}: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: Readonly<{
  lines?: number;
  className?: string;
}>) {
  const lineItems = Array.from({ length: lines }, (_, i) => `skel-line-${i}`);
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {lineItems.map((id, i) => (
        <div
          key={id}
          className={`skeleton h-3.5 ${getLineWidth(i, lines)}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden="true"
      className={`panel space-y-3 p-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 4,
  cols = 3,
  className = "",
}: Readonly<{
  rows?: number;
  cols?: number;
  className?: string;
}>) {
  const colIds = Array.from({ length: cols }, (_, c) => `skel-col-${c}`);
  const rowIds = Array.from({ length: rows }, (_, r) => `skel-row-${r}`);

  return (
    <div aria-hidden="true" className={`w-full space-y-2.5 ${className}`}>
      <div className="flex gap-4 border-b border-[var(--line)] pb-2">
        {colIds.map((id) => (
          <div key={id} className="skeleton h-4 flex-1" />
        ))}
      </div>
      {rowIds.map((rowId) => (
        <div key={rowId} className="flex gap-4 py-1.5">
          {colIds.map((colId, c) => (
            <div
              key={`${rowId}-${colId}`}
              className={`skeleton h-3 flex-1 ${c === 0 ? "opacity-90" : "opacity-60"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
