import type { HTMLAttributes } from "react";

export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
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
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton h-3.5 ${
            i === lines - 1 ? "w-3/5" : i % 2 === 0 ? "w-full" : "w-4/5"
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
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
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`w-full space-y-2.5 ${className}`}>
      <div className="flex gap-4 border-b border-[var(--line)] pb-2">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="skeleton h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-1.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`skeleton h-3 flex-1 ${c === 0 ? "opacity-90" : "opacity-60"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
