"use client";

import { InsightsDashboard } from "@/components/dashboard/InsightsDashboard";

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <InsightsDashboard showHeader={true} />
    </div>
  );
}
