import { LegalPage } from "@/components/LegalPage";
import { COOKIES_SECTIONS } from "@/lib/legal-content";

export const metadata = {
  title: "Cookies — MyInstantAI Agents",
  description: "Draft cookie and local-storage notice for the MyInstantAI Agent Marketplace.",
};

export default function CookiesPage() {
  return <LegalPage title="Cookies & local storage" sections={COOKIES_SECTIONS} />;
}
