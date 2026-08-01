import { Suspense } from "react";
import { CatalogGrid } from "@/components/CatalogGrid";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="panel px-6 py-12 text-center text-sm text-[var(--muted)]">
          Loading catalogue…
        </div>
      }
    >
      <CatalogGrid />
    </Suspense>
  );
}
