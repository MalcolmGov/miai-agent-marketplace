import { LegalPage } from "@/components/LegalPage";
import { TERMS_SECTIONS } from "@/lib/legal-content";

export const metadata = {
  title: "Terms — MyInstantAI Agents",
  description: "Draft terms of use for the MyInstantAI Agent Marketplace.",
};

export default function TermsPage() {
  return <LegalPage title="Terms of use" sections={TERMS_SECTIONS} />;
}
