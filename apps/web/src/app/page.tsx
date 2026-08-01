"use client";

import { Suspense } from "react";
import { CatalogGrid } from "@/components/CatalogGrid";
import { useT } from "@/lib/locale";

function HomeFallback() {
  const t = useT();
  return (
    <div className="panel px-6 py-12 text-center text-sm text-[var(--muted)]">
      {t("catalog.loading")}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <CatalogGrid />
    </Suspense>
  );
}
