import { LegalPage } from "@/components/LegalPage";
import { PRIVACY_SECTIONS } from "@/lib/legal-content";

export const metadata = {
  title: "Privacy — MyInstantAI Agents",
  description: "Draft privacy notice for the MyInstantAI Agent Marketplace.",
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy notice" sections={PRIVACY_SECTIONS} />;
}
