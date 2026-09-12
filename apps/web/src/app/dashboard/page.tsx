import type { Metadata } from "next";
import { MyInstantAIDashboard } from "@/components/MyInstantAIDashboard";

export const metadata: Metadata = {
  title: "Dashboard — MyInstantAI",
  description: "Your AI command center — chat, search, automate, learn.",
};

export default function DashboardPage() {
  return <MyInstantAIDashboard tokenBalance={11716} />;
}
