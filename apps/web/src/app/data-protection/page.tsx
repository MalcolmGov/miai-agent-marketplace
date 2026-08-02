import { LegalPage } from "@/components/LegalPage";
import { DATA_PROTECTION_SECTIONS } from "@/lib/legal-content";

export const metadata = {
  title: "Data protection — MyInstantAI Agents",
  description: "Draft data protection summary for the MyInstantAI Agent Marketplace.",
};

export default function DataProtectionPage() {
  return <LegalPage title="Data protection" sections={DATA_PROTECTION_SECTIONS} />;
}
