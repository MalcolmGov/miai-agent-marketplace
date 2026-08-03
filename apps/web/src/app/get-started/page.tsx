import type { Metadata } from "next";
import { GetStartedWizard } from "@/components/GetStartedWizard";

export const metadata: Metadata = {
  title: "Get started — MyInstantAI Agents for business",
  description:
    "Set up a business workspace and rent pre-built AI agents. Separate from consumer token signup.",
};

export default function GetStartedPage() {
  return <GetStartedWizard />;
}
