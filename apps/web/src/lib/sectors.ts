/**
 * Sector taxonomy for catalogue Industry filter / card labels.
 * Labels must match marketplaceCategory() output in @miai/agent-protocol.
 */
export type SectorId =
  | "telecom"
  | "government"
  | "manufacturing"
  | "financial"
  | "healthcare"
  | "retail"
  | "hospitality"
  | "logistics"
  | "property"
  | "education"
  | "professional"
  | "hr_internal"
  | "customer_front"
  | "ai_devtools"
  | "data_analytics";

export interface SectorDef {
  id: SectorId;
  label: string;
  /** Soft card-rail accent */
  accent: string;
}

/** Buyer-facing sectors (Wave 1 ships labels for all; later waves fill families). */
export const SECTORS: SectorDef[] = [
  {
    id: "telecom",
    label: "Telecommunications",
    accent: "linear-gradient(90deg,#38bdf8,#6366f1)",
  },
  {
    id: "government",
    label: "Government & public sector",
    accent: "linear-gradient(90deg,#94a3b8,#3dd6c6)",
  },
  {
    id: "manufacturing",
    label: "Manufacturing & industrial",
    accent: "linear-gradient(90deg,#f59e0b,#64748b)",
  },
  {
    id: "financial",
    label: "Financial services",
    accent: "linear-gradient(90deg,#f0b429,#3dd6c6)",
  },
  {
    id: "healthcare",
    label: "Health & wellness",
    accent: "linear-gradient(90deg,#5eead4,#34d399)",
  },
  {
    id: "retail",
    label: "Retail & e-commerce",
    accent: "linear-gradient(90deg,#38bdf8,#3dd6c6)",
  },
  {
    id: "hospitality",
    label: "Hospitality & travel",
    accent: "linear-gradient(90deg,#fbbf24,#3dd6c6)",
  },
  {
    id: "logistics",
    label: "Logistics & field ops",
    accent: "linear-gradient(90deg,#2dd4bf,#0ea5e9)",
  },
  {
    id: "property",
    label: "Property",
    accent: "linear-gradient(90deg,#7eb6ff,#3dd6c6)",
  },
  {
    id: "education",
    label: "Education",
    accent: "linear-gradient(90deg,#6aefe0,#3dd6c6)",
  },
  {
    id: "professional",
    label: "Professional services",
    accent: "linear-gradient(90deg,#94a3b8,#3dd6c6)",
  },
  {
    id: "hr_internal",
    label: "HR & internal ops",
    accent: "linear-gradient(90deg,#64748b,#3dd6c6)",
  },
  {
    id: "customer_front",
    label: "Customer & front office",
    accent: "linear-gradient(90deg,#3dd6c6,#5ec8f0)",
  },
  {
    id: "ai_devtools",
    label: "AI & developer tools",
    accent: "linear-gradient(90deg,#22d3ee,#334155)",
  },
  {
    id: "data_analytics",
    label: "Data & analytics",
    accent: "linear-gradient(90deg,#a78bfa,#3dd6c6)",
  },
];

export const SECTOR_BY_LABEL: Record<string, SectorDef> = Object.fromEntries(
  SECTORS.map((s) => [s.label, s]),
);

export function sectorAccent(label: string): string {
  return SECTOR_BY_LABEL[label]?.accent ?? "linear-gradient(90deg,#3dd6c6,#2bb8a8)";
}
